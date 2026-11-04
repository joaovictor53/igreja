"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, gte, lt, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  celebracoes,
  escalaItens,
  escalas,
  funcaoMembros,
  funcoesEscala,
  pessoas,
} from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { gerarEscala } from "@/lib/escala";
import { zonedToUtc } from "@/lib/datas";

const PAPEIS = ["admin", "paroco", "secretaria"] as const;
const guard = () => requireParoquia([...PAPEIS]);
const refresh = () => revalidatePath("/painel/escalas", "layout");

export async function criarFuncao(formData: FormData) {
  const { paroquia, user } = await guard();
  const d = z
    .object({ nome: z.string().trim().min(2), vagas: z.coerce.number().int().min(1).max(20) })
    .parse(Object.fromEntries(formData));
  await db.insert(funcoesEscala).values({ ...d, paroquiaId: paroquia.id, createdBy: user.id });
  refresh();
}

export async function adicionarMembro(formData: FormData) {
  const { paroquia, user } = await guard();
  const d = z.object({ funcaoId: z.uuid(), pessoaId: z.uuid() }).parse(Object.fromEntries(formData));
  const [funcao] = await db
    .select({ id: funcoesEscala.id })
    .from(funcoesEscala)
    .where(and(eq(funcoesEscala.id, d.funcaoId), eq(funcoesEscala.paroquiaId, paroquia.id)));
  const [pessoa] = await db
    .select({ id: pessoas.id })
    .from(pessoas)
    .where(and(eq(pessoas.id, d.pessoaId), eq(pessoas.paroquiaId, paroquia.id)));
  if (!funcao || !pessoa) throw new Error("Função ou pessoa inválida");
  await db.insert(funcaoMembros).values({ ...d, paroquiaId: paroquia.id, createdBy: user.id }).onConflictDoNothing();
  refresh();
}

export async function removerMembro(formData: FormData) {
  const { paroquia } = await guard();
  const id = z.uuid().parse(formData.get("id"));
  await db.delete(funcaoMembros).where(and(eq(funcaoMembros.id, id), eq(funcaoMembros.paroquiaId, paroquia.id)));
  refresh();
}

/** Gera (ou regera) o rascunho do mês. Escala já publicada não é sobrescrita. */
export async function gerarEscalaMes(formData: FormData) {
  const { paroquia, user } = await guard();
  const mes = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).parse(formData.get("mes"));
  const [ano, m] = mes.split("-").map(Number);
  const inicioMes = zonedToUtc(ano, m, 1, 0, 0, paroquia.fuso);
  const fimMes = zonedToUtc(m === 12 ? ano + 1 : ano, m === 12 ? 1 : m + 1, 1, 0, 0, paroquia.fuso);

  const [existente] = await db
    .select()
    .from(escalas)
    .where(and(eq(escalas.paroquiaId, paroquia.id), eq(escalas.mes, mes)));
  if (existente?.status === "publicada") throw new Error("Escala já publicada");

  const [cels, funcoes, membros] = await Promise.all([
    db
      .select({ id: celebracoes.id, inicio: celebracoes.inicio })
      .from(celebracoes)
      .where(
        and(
          eq(celebracoes.paroquiaId, paroquia.id),
          ne(celebracoes.status, "cancelada"),
          gte(celebracoes.inicio, inicioMes),
          lt(celebracoes.inicio, fimMes),
        ),
      )
      .orderBy(asc(celebracoes.inicio)),
    db.select().from(funcoesEscala).where(eq(funcoesEscala.paroquiaId, paroquia.id)).orderBy(asc(funcoesEscala.nome)),
    db.select().from(funcaoMembros).where(eq(funcaoMembros.paroquiaId, paroquia.id)),
  ]);

  const itens = gerarEscala(
    cels,
    funcoes.map((f) => ({
      id: f.id,
      vagas: f.vagas,
      membros: membros.filter((x) => x.funcaoId === f.id).map((x) => x.pessoaId),
    })),
    { seed: ano * 100 + m },
  );

  await db.transaction(async (tx) => {
    const escalaId =
      existente?.id ??
      (await tx.insert(escalas).values({ paroquiaId: paroquia.id, mes, createdBy: user.id }).returning())[0].id;
    await tx.delete(escalaItens).where(eq(escalaItens.escalaId, escalaId));
    if (itens.length)
      await tx.insert(escalaItens).values(itens.map((i) => ({ ...i, escalaId, paroquiaId: paroquia.id, createdBy: user.id })));
  });
  refresh();
}

export async function atribuirItem(formData: FormData) {
  const { paroquia } = await guard();
  const d = z.object({ itemId: z.uuid(), pessoaId: z.uuid().or(z.literal("")) }).parse(Object.fromEntries(formData));
  const [item] = await db
    .select({ id: escalaItens.id, status: escalas.status })
    .from(escalaItens)
    .innerJoin(escalas, eq(escalas.id, escalaItens.escalaId))
    .where(and(eq(escalaItens.id, d.itemId), eq(escalaItens.paroquiaId, paroquia.id)));
  if (!item || item.status === "publicada") throw new Error("Item inválido");
  if (d.pessoaId) {
    const [p] = await db
      .select({ id: pessoas.id })
      .from(pessoas)
      .where(and(eq(pessoas.id, d.pessoaId), eq(pessoas.paroquiaId, paroquia.id)));
    if (!p) throw new Error("Pessoa inválida");
  }
  await db.update(escalaItens).set({ pessoaId: d.pessoaId || null }).where(eq(escalaItens.id, item.id));
  refresh();
}

export async function publicarEscala(formData: FormData) {
  const { paroquia } = await guard();
  const id = z.uuid().parse(formData.get("id"));
  await db
    .update(escalas)
    .set({ status: "publicada", updatedAt: new Date() })
    .where(and(eq(escalas.id, id), eq(escalas.paroquiaId, paroquia.id)));
  refresh();
}
