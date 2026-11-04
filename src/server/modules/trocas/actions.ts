"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { celebracoes, escalaItens, escalas, funcaoMembros, funcoesEscala, pessoas, trocas } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { gestoresDaParoquia, notificar, usuarioDaPessoa, usuariosDaFuncao } from "@/server/notificar";
import { formatarDataHora } from "@/lib/datas";

const URL_MINHAS = "/painel/escalas/minhas";
const refresh = () => revalidatePath("/painel/escalas", "layout");
const pgCodigo = (e: unknown) => (e as { code?: string; cause?: { code?: string } }).code ?? (e as { cause?: { code?: string } }).cause?.code;

export type TrocaState = { erro?: string };

/** Dados do item da escala com tudo o que as regras precisam, sempre filtrado pela paróquia. */
async function carregarItem(itemId: string, paroquiaId: string) {
  const [row] = await db
    .select({
      item: escalaItens,
      funcao: funcoesEscala.nome,
      inicio: celebracoes.inicio,
      celStatus: celebracoes.status,
      escalaStatus: escalas.status,
    })
    .from(escalaItens)
    .innerJoin(escalas, eq(escalas.id, escalaItens.escalaId))
    .innerJoin(celebracoes, eq(celebracoes.id, escalaItens.celebracaoId))
    .innerJoin(funcoesEscala, eq(funcoesEscala.id, escalaItens.funcaoId))
    .where(and(eq(escalaItens.id, itemId), eq(escalaItens.paroquiaId, paroquiaId)));
  return row ?? null;
}

export async function pedirTroca(_: TrocaState, formData: FormData): Promise<TrocaState> {
  const { paroquia, pessoaId, user } = await requireParoquia();
  if (!pessoaId) return { erro: "Sua conta não está vinculada a uma pessoa" };
  const itemId = z.uuid().parse(formData.get("itemId"));

  const r = await carregarItem(itemId, paroquia.id);
  if (!r || r.item.pessoaId !== pessoaId) return { erro: "Esta escala não é sua" };
  if (r.escalaStatus !== "publicada" || r.celStatus !== "agendada" || r.inicio <= new Date()) {
    return { erro: "Só é possível pedir troca de escalas publicadas e futuras" };
  }

  try {
    await db.insert(trocas).values({ paroquiaId: paroquia.id, escalaItemId: itemId, solicitantePessoaId: pessoaId, createdBy: user.id });
  } catch (e) {
    if (pgCodigo(e) === "23505") return { erro: "Já existe um pedido de troca aberto para esta escala" };
    throw e;
  }

  const [eu] = await db.select({ nome: pessoas.nome }).from(pessoas).where(eq(pessoas.id, pessoaId));
  const quando = formatarDataHora(r.inicio, paroquia.fuso);
  await notificar(paroquia.id, await usuariosDaFuncao(r.item.funcaoId, [pessoaId]), {
    titulo: "Pedido de troca de escala",
    corpo: `${eu.nome} precisa de substituto: ${r.funcao}, ${quando}.`,
    url: URL_MINHAS,
  });
  refresh();
  return {};
}

export async function assumirTroca(_: TrocaState, formData: FormData): Promise<TrocaState> {
  const { paroquia, pessoaId, user } = await requireParoquia();
  if (!pessoaId) return { erro: "Sua conta não está vinculada a uma pessoa" };
  const trocaId = z.uuid().parse(formData.get("trocaId"));

  const resultado = await db.transaction(async (tx) => {
    const [t] = await tx
      .select()
      .from(trocas)
      .where(and(eq(trocas.id, trocaId), eq(trocas.paroquiaId, paroquia.id), eq(trocas.status, "aberta")));
    if (!t) return { erro: "Este pedido não está mais disponível" } as const;
    if (t.solicitantePessoaId === pessoaId) return { erro: "Você não pode assumir a própria troca" } as const;

    const [r] = await tx
      .select({ item: escalaItens, funcao: funcoesEscala.nome, inicio: celebracoes.inicio, celStatus: celebracoes.status, escalaStatus: escalas.status })
      .from(escalaItens)
      .innerJoin(escalas, eq(escalas.id, escalaItens.escalaId))
      .innerJoin(celebracoes, eq(celebracoes.id, escalaItens.celebracaoId))
      .innerJoin(funcoesEscala, eq(funcoesEscala.id, escalaItens.funcaoId))
      .where(eq(escalaItens.id, t.escalaItemId));
    if (!r || r.item.pessoaId !== t.solicitantePessoaId) return { erro: "A escala mudou: este pedido perdeu a validade" } as const;
    if (r.escalaStatus !== "publicada" || r.celStatus !== "agendada" || r.inicio <= new Date()) {
      return { erro: "Esta celebração não aceita mais trocas" } as const;
    }

    const [habilitado] = await tx
      .select({ id: funcaoMembros.id })
      .from(funcaoMembros)
      .where(and(eq(funcaoMembros.funcaoId, r.item.funcaoId), eq(funcaoMembros.pessoaId, pessoaId)));
    if (!habilitado) return { erro: "Você não faz parte desta função" } as const;

    const [jaEscalado] = await tx
      .select({ id: escalaItens.id })
      .from(escalaItens)
      .where(and(eq(escalaItens.celebracaoId, r.item.celebracaoId), eq(escalaItens.pessoaId, pessoaId)));
    if (jaEscalado) return { erro: "Você já está escalado nesta celebração" } as const;

    // transição atômica: se outra pessoa assumiu primeiro, nenhuma linha é atualizada
    const [fechada] = await tx
      .update(trocas)
      .set({ status: "concluida", substitutoPessoaId: pessoaId, concluidaEm: new Date(), updatedAt: new Date() })
      .where(and(eq(trocas.id, t.id), eq(trocas.status, "aberta")))
      .returning({ id: trocas.id });
    if (!fechada) return { erro: "Outra pessoa assumiu primeiro" } as const;
    await tx.update(escalaItens).set({ pessoaId, confirmado: false }).where(eq(escalaItens.id, r.item.id));
    return { ok: true, t, funcao: r.funcao, inicio: r.inicio } as const;
  });
  if ("erro" in resultado) return { erro: resultado.erro };

  const [eu] = await db.select({ nome: pessoas.nome }).from(pessoas).where(eq(pessoas.id, pessoaId));
  const quando = formatarDataHora(resultado.inicio, paroquia.fuso);
  const solicitante = await usuarioDaPessoa(paroquia.id, resultado.t.solicitantePessoaId);
  if (solicitante) {
    await notificar(paroquia.id, [solicitante], {
      titulo: "Sua troca foi aceita",
      corpo: `${eu.nome} assumiu sua escala: ${resultado.funcao}, ${quando}.`,
      url: URL_MINHAS,
    });
  }
  const [sol] = await db.select({ nome: pessoas.nome }).from(pessoas).where(eq(pessoas.id, resultado.t.solicitantePessoaId));
  const gestores = (await gestoresDaParoquia(paroquia.id)).filter((u) => u !== user.id && u !== solicitante);
  await notificar(paroquia.id, gestores, {
    titulo: "Troca de escala concluída",
    corpo: `${eu.nome} assumiu a escala de ${sol.nome}: ${resultado.funcao}, ${quando}.`,
    url: "/painel/escalas",
  });
  refresh();
  return {};
}

export async function cancelarTroca(formData: FormData) {
  const { paroquia, pessoaId } = await requireParoquia();
  const trocaId = z.uuid().parse(formData.get("trocaId"));
  if (!pessoaId) return;
  await db
    .update(trocas)
    .set({ status: "cancelada", updatedAt: new Date() })
    .where(
      and(
        eq(trocas.id, trocaId),
        eq(trocas.paroquiaId, paroquia.id),
        eq(trocas.solicitantePessoaId, pessoaId),
        eq(trocas.status, "aberta"),
      ),
    );
  refresh();
}
