"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { TransactionRollbackError, and, eq, gt, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { convites, membrosParoquia, papeis, pessoas } from "@/db/schema";
import { auditar } from "@/server/audit";
import { requireParoquia, requireUser } from "@/server/auth/session";
import { ehPapelPadrao } from "@/lib/permissoes";

const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000;
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export type ConviteState = { link?: string; erro?: string };

export async function gerarConvite(_: ConviteState, formData: FormData): Promise<ConviteState> {
  const { paroquia, user, pode } = await requireParoquia("convites:gerir");
  const pessoaId = z.uuid().parse(formData.get("pessoaId"));
  // Escolher o papel é conceder acesso: só quem administra papéis. Os demais convidam como "membro".
  const papelInicial = pode("papeis:gerir") ? String(formData.get("papel") || "membro").slice(0, 40) : "membro";
  const [pessoa] = await db
    .select({ id: pessoas.id })
    .from(pessoas)
    .where(and(eq(pessoas.id, pessoaId), eq(pessoas.paroquiaId, paroquia.id)));
  if (!pessoa) return { erro: "Pessoa inválida" };

  if (!ehPapelPadrao(papelInicial)) {
    const [existe] = await db
      .select({ id: papeis.id })
      .from(papeis)
      .where(and(eq(papeis.paroquiaId, paroquia.id), eq(papeis.chave, papelInicial)));
    if (!existe) return { erro: "Papel inválido" };
  }

  const token = randomBytes(24).toString("base64url");
  const expiraEm = new Date(Date.now() + VALIDADE_MS);
  await db.transaction(async (tx) => {
    // um convite por pessoa: o novo link invalida os anteriores ainda não usados
    await tx
      .update(convites)
      .set({ revogadoEm: new Date() })
      .where(and(eq(convites.pessoaId, pessoaId), eq(convites.paroquiaId, paroquia.id), isNull(convites.usadoEm), isNull(convites.revogadoEm)));
    const [c] = await tx
      .insert(convites)
      .values({ paroquiaId: paroquia.id, pessoaId, tokenHash: hash(token), expiraEm, papelInicial, createdBy: user.id })
      .returning({ id: convites.id });
    await auditar(tx, { paroquiaId: paroquia.id, usuarioId: user.id, tabela: "convites", registroId: c.id, acao: "criar", depois: { pessoaId, expiraEm, papel: papelInicial } });
  });
  const origem = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  return { link: `${origem}/convite/${token}` };
}

/** Invalida os convites ainda não usados de uma pessoa. */
export async function revogarConvites(_: ConviteState, formData: FormData): Promise<ConviteState> {
  const { paroquia, user } = await requireParoquia("convites:gerir");
  const pessoaId = z.uuid().safeParse(formData.get("pessoaId"));
  if (!pessoaId.success) return { erro: "Pessoa inválida" };
  await db.transaction(async (tx) => {
    const revogados = await tx
      .update(convites)
      .set({ revogadoEm: new Date() })
      .where(and(eq(convites.pessoaId, pessoaId.data), eq(convites.paroquiaId, paroquia.id), isNull(convites.usadoEm), isNull(convites.revogadoEm)))
      .returning({ id: convites.id });
    for (const c of revogados)
      await auditar(tx, { paroquiaId: paroquia.id, usuarioId: user.id, tabela: "convites", registroId: c.id, acao: "revogar" });
  });
  revalidatePath("/painel/pessoas");
  return {};
}

export type AceiteState = { erro?: string };

export async function aceitarConvite(token: string): Promise<AceiteState> {
  const user = await requireUser();
  const erro = await db.transaction(async (tx) => {
    const [convite] = await tx
      .update(convites)
      .set({ usadoEm: new Date() })
      .where(and(eq(convites.tokenHash, hash(token)), isNull(convites.usadoEm), isNull(convites.revogadoEm), gt(convites.expiraEm, new Date())))
      .returning();
    if (!convite) return "Convite inválido, já usado ou expirado";

    const [outro] = await tx
      .select({ id: membrosParoquia.id })
      .from(membrosParoquia)
      .where(and(eq(membrosParoquia.pessoaId, convite.pessoaId), ne(membrosParoquia.usuarioId, user.id)));
    if (outro) tx.rollback();

    // o papel pode ter sido excluído depois do convite: sem ele, entra como membro
    let papel = convite.papelInicial;
    if (!ehPapelPadrao(papel)) {
      const [existe] = await tx
        .select({ id: papeis.id })
        .from(papeis)
        .where(and(eq(papeis.paroquiaId, convite.paroquiaId), eq(papeis.chave, papel)));
      if (!existe) papel = "membro";
    }

    const [vinculo] = await tx
      .insert(membrosParoquia)
      .values({ paroquiaId: convite.paroquiaId, usuarioId: user.id, papel, pessoaId: convite.pessoaId })
      .onConflictDoUpdate({
        target: [membrosParoquia.paroquiaId, membrosParoquia.usuarioId],
        set: { pessoaId: convite.pessoaId },
      })
      .returning({ id: membrosParoquia.id, papel: membrosParoquia.papel });
    await auditar(tx, {
      paroquiaId: convite.paroquiaId,
      usuarioId: user.id,
      tabela: "membros_paroquia",
      registroId: vinculo.id,
      acao: "vincular",
      depois: { pessoaId: convite.pessoaId, papel: vinculo.papel, convite: convite.id },
    });
    return null;
  }).catch((e) => {
    if (e instanceof TransactionRollbackError) return "Esta pessoa já está vinculada a outro usuário";
    throw e;
  });
  if (erro) return { erro };
  redirect("/painel/escalas/minhas");
}
