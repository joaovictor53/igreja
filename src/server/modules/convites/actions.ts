"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { TransactionRollbackError, and, eq, gt, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { convites, membrosParoquia, pessoas } from "@/db/schema";
import { auditar } from "@/server/audit";
import { requireParoquia, requireUser } from "@/server/auth/session";

const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000;
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export type ConviteState = { link?: string; erro?: string };

export async function gerarConvite(_: ConviteState, formData: FormData): Promise<ConviteState> {
  const { paroquia, user } = await requireParoquia(["admin", "paroco", "secretaria"]);
  const pessoaId = z.uuid().parse(formData.get("pessoaId"));
  const [pessoa] = await db
    .select({ id: pessoas.id })
    .from(pessoas)
    .where(and(eq(pessoas.id, pessoaId), eq(pessoas.paroquiaId, paroquia.id)));
  if (!pessoa) return { erro: "Pessoa inválida" };

  const token = randomBytes(24).toString("base64url");
  const expiraEm = new Date(Date.now() + VALIDADE_MS);
  await db.transaction(async (tx) => {
    const [c] = await tx
      .insert(convites)
      .values({ paroquiaId: paroquia.id, pessoaId, tokenHash: hash(token), expiraEm, createdBy: user.id })
      .returning({ id: convites.id });
    await auditar(tx, { paroquiaId: paroquia.id, usuarioId: user.id, tabela: "convites", registroId: c.id, acao: "criar", depois: { pessoaId, expiraEm } });
  });
  const origem = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  return { link: `${origem}/convite/${token}` };
}

export type AceiteState = { erro?: string };

export async function aceitarConvite(token: string): Promise<AceiteState> {
  const user = await requireUser();
  const erro = await db.transaction(async (tx) => {
    const [convite] = await tx
      .update(convites)
      .set({ usadoEm: new Date() })
      .where(and(eq(convites.tokenHash, hash(token)), isNull(convites.usadoEm), gt(convites.expiraEm, new Date())))
      .returning();
    if (!convite) return "Convite inválido, já usado ou expirado";

    const [outro] = await tx
      .select({ id: membrosParoquia.id })
      .from(membrosParoquia)
      .where(and(eq(membrosParoquia.pessoaId, convite.pessoaId), ne(membrosParoquia.usuarioId, user.id)));
    if (outro) tx.rollback();

    const [vinculo] = await tx
      .insert(membrosParoquia)
      .values({ paroquiaId: convite.paroquiaId, usuarioId: user.id, papel: "membro", pessoaId: convite.pessoaId })
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
