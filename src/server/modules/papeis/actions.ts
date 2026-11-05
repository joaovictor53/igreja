"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { membrosParoquia, papeis } from "@/db/schema";
import { auditar } from "@/server/audit";
import { requireParoquia } from "@/server/auth/session";
import { NOMES_PAPEL, ehPapelPadrao, permissoesPadrao, permissoesValidas } from "@/lib/permissoes";

export type PapelState = { erro?: string; ok?: boolean };

const guard = () => requireParoquia("papeis:gerir");
const refresh = () => {
  // as permissões entram no sidebar do layout, então o layout também precisa recarregar
  revalidatePath("/painel", "layout");
};

const nomeSchema = z.string().trim().min(2, "Informe o nome do papel").max(60, "Nome muito longo");
const chaveSchema = z.string().min(1).max(40);

export async function criarPapel(_: PapelState, formData: FormData): Promise<PapelState> {
  const { paroquia, user } = await guard();
  const nome = nomeSchema.safeParse(formData.get("nome"));
  if (!nome.success) return { erro: nome.error.issues[0].message };
  const permissoes = permissoesValidas(formData.getAll("permissoes"));
  const chave = `c_${randomBytes(4).toString("hex")}`;
  await db.transaction(async (tx) => {
    const [p] = await tx
      .insert(papeis)
      .values({ paroquiaId: paroquia.id, chave, nome: nome.data, permissoes, createdBy: user.id })
      .returning({ id: papeis.id });
    await auditar(tx, { paroquiaId: paroquia.id, usuarioId: user.id, tabela: "papeis", registroId: p.id, acao: "criar", depois: { nome: nome.data, permissoes } });
  });
  refresh();
  return { ok: true };
}

/** Papel de sistema: só as permissões mudam (o nome é fixo). Papel criado pela paróquia: nome e permissões. */
export async function salvarPapel(_: PapelState, formData: FormData): Promise<PapelState> {
  const { paroquia, user } = await guard();
  const chave = chaveSchema.safeParse(formData.get("chave"));
  if (!chave.success || chave.data === "admin") return { erro: "Este papel não pode ser editado" };
  const sistema = ehPapelPadrao(chave.data);
  const permissoes = permissoesValidas(formData.getAll("permissoes"));

  const erro = await db.transaction(async (tx) => {
    const [atual] = await tx
      .select()
      .from(papeis)
      .where(and(eq(papeis.paroquiaId, paroquia.id), eq(papeis.chave, chave.data)));
    if (!sistema && !atual) return "Papel não encontrado";
    let nome = sistema ? NOMES_PAPEL[chave.data as keyof typeof NOMES_PAPEL] : atual.nome;
    if (!sistema) {
      const n = nomeSchema.safeParse(formData.get("nome"));
      if (!n.success) return n.error.issues[0].message;
      nome = n.data;
    }
    const antes = atual ? atual.permissoes : permissoesPadrao(chave.data);
    const [p] = await tx
      .insert(papeis)
      .values({ paroquiaId: paroquia.id, chave: chave.data, nome, permissoes, createdBy: user.id })
      .onConflictDoUpdate({ target: [papeis.paroquiaId, papeis.chave], set: { nome, permissoes, updatedAt: new Date() } })
      .returning({ id: papeis.id });
    await auditar(tx, {
      paroquiaId: paroquia.id,
      usuarioId: user.id,
      tabela: "papeis",
      registroId: p.id,
      acao: "alterar",
      antes: { nome: atual?.nome ?? nome, permissoes: antes },
      depois: { nome, permissoes },
    });
    return null;
  });
  if (erro) return { erro };
  refresh();
  return { ok: true };
}

/** Papel de sistema volta às permissões padrão, apagando a personalização. */
export async function restaurarPapel(_: PapelState, formData: FormData): Promise<PapelState> {
  const { paroquia, user } = await guard();
  const chave = chaveSchema.safeParse(formData.get("chave"));
  if (!chave.success || chave.data === "admin" || !ehPapelPadrao(chave.data)) return { erro: "Este papel não tem padrão a restaurar" };
  await db.transaction(async (tx) => {
    const [apagado] = await tx
      .delete(papeis)
      .where(and(eq(papeis.paroquiaId, paroquia.id), eq(papeis.chave, chave.data)))
      .returning();
    if (apagado)
      await auditar(tx, {
        paroquiaId: paroquia.id,
        usuarioId: user.id,
        tabela: "papeis",
        registroId: apagado.id,
        acao: "alterar",
        antes: { nome: apagado.nome, permissoes: apagado.permissoes },
        depois: { nome: apagado.nome, permissoes: permissoesPadrao(chave.data) },
      });
  });
  refresh();
  return { ok: true };
}

export async function excluirPapel(_: PapelState, formData: FormData): Promise<PapelState> {
  const { paroquia, user } = await guard();
  const chave = chaveSchema.safeParse(formData.get("chave"));
  if (!chave.success || ehPapelPadrao(chave.data)) return { erro: "Papéis de sistema não podem ser excluídos" };
  const erro = await db.transaction(async (tx) => {
    const [{ n }] = await tx
      .select({ n: count() })
      .from(membrosParoquia)
      .where(and(eq(membrosParoquia.paroquiaId, paroquia.id), eq(membrosParoquia.papel, chave.data)));
    if (n > 0) return `Há ${n} membro(s) com este papel. Troque o papel deles antes de excluir.`;
    const [apagado] = await tx
      .delete(papeis)
      .where(and(eq(papeis.paroquiaId, paroquia.id), eq(papeis.chave, chave.data)))
      .returning();
    if (!apagado) return "Papel não encontrado";
    await auditar(tx, {
      paroquiaId: paroquia.id,
      usuarioId: user.id,
      tabela: "papeis",
      registroId: apagado.id,
      acao: "excluir",
      antes: { nome: apagado.nome, permissoes: apagado.permissoes },
    });
    return null;
  });
  if (erro) return { erro };
  refresh();
  return { ok: true };
}

/** Não dá para mudar o próprio papel: assim sempre sobra pelo menos um administrador. */
export async function atribuirPapel(_: PapelState, formData: FormData): Promise<PapelState> {
  const { paroquia, user } = await guard();
  const membroId = z.uuid().safeParse(formData.get("membroId"));
  const novo = chaveSchema.safeParse(formData.get("papel"));
  if (!membroId.success || !novo.success) return { erro: "Dados inválidos" };

  const erro = await db.transaction(async (tx) => {
    const [membro] = await tx
      .select()
      .from(membrosParoquia)
      .where(and(eq(membrosParoquia.id, membroId.data), eq(membrosParoquia.paroquiaId, paroquia.id)));
    if (!membro) return "Membro não encontrado";
    if (membro.usuarioId === user.id) return "Você não pode mudar o seu próprio papel";
    if (!ehPapelPadrao(novo.data)) {
      const [existe] = await tx
        .select({ id: papeis.id })
        .from(papeis)
        .where(and(eq(papeis.paroquiaId, paroquia.id), eq(papeis.chave, novo.data)));
      if (!existe) return "Papel não encontrado";
    }
    if (membro.papel === novo.data) return null;
    await tx.update(membrosParoquia).set({ papel: novo.data, updatedAt: new Date() }).where(eq(membrosParoquia.id, membro.id));
    await auditar(tx, {
      paroquiaId: paroquia.id,
      usuarioId: user.id,
      tabela: "membros_paroquia",
      registroId: membro.id,
      acao: "alterar",
      antes: { papel: membro.papel },
      depois: { papel: novo.data },
    });
    return null;
  });
  if (erro) return { erro };
  refresh();
  return { ok: true };
}
