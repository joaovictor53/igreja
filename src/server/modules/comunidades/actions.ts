"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { comunidades } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";

export type ComunidadeState = { erro?: string; ok?: boolean };

const guard = () => requireParoquia("comunidades:gerir");
const refresh = () => revalidatePath("/painel/comunidades");

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da comunidade").max(120),
  endereco: z.string().trim().max(300),
});

export async function criarComunidade(_: ComunidadeState, formData: FormData): Promise<ComunidadeState> {
  const { paroquia, user } = await guard();
  const d = schema.safeParse(Object.fromEntries(formData));
  if (!d.success) return { erro: d.error.issues[0].message };
  await db.insert(comunidades).values({
    paroquiaId: paroquia.id,
    nome: d.data.nome,
    endereco: d.data.endereco || null,
    createdBy: user.id,
  });
  refresh();
  return { ok: true };
}

export async function editarComunidade(_: ComunidadeState, formData: FormData): Promise<ComunidadeState> {
  const { paroquia } = await guard();
  const id = z.uuid().safeParse(formData.get("id"));
  const d = schema.safeParse(Object.fromEntries(formData));
  if (!id.success) return { erro: "Comunidade não encontrada" };
  if (!d.success) return { erro: d.error.issues[0].message };
  await db
    .update(comunidades)
    .set({ nome: d.data.nome, endereco: d.data.endereco || null, updatedAt: new Date() })
    .where(and(eq(comunidades.id, id.data), eq(comunidades.paroquiaId, paroquia.id)));
  refresh();
  return { ok: true };
}

/** O banco recusa a exclusão se houver horários, celebrações, turmas ou datas ligados à comunidade. */
export async function excluirComunidade(_: ComunidadeState, formData: FormData): Promise<ComunidadeState> {
  const { paroquia } = await guard();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { erro: "Comunidade não encontrada" };
  try {
    await db.delete(comunidades).where(and(eq(comunidades.id, id.data), eq(comunidades.paroquiaId, paroquia.id)));
  } catch (e) {
    const codigo = (e as { code?: string; cause?: { code?: string } }).code ?? (e as { cause?: { code?: string } }).cause?.code;
    if (codigo === "23503") return { erro: "Esta comunidade já tem horários, celebrações, turmas ou datas ligados e não pode ser excluída." };
    throw e;
  }
  refresh();
  return { ok: true };
}
