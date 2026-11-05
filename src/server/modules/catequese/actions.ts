"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { comunidades, etapasCatequese, matriculasCatequese, pessoas, turmaCatequistas, turmasCatequese } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { exigirDaParoquia } from "@/server/tenant";

const guard = () => requireParoquia("catequese:gerir");
const refresh = () => revalidatePath("/painel/catequese", "layout");

export async function criarEtapa(formData: FormData) {
  const { paroquia, user } = await guard();
  const nome = z.string().trim().min(2).max(100).parse(formData.get("nome"));
  const [{ n }] = await db.select({ n: count() }).from(etapasCatequese).where(eq(etapasCatequese.paroquiaId, paroquia.id));
  await db.insert(etapasCatequese).values({ paroquiaId: paroquia.id, nome, ordem: n, createdBy: user.id });
  refresh();
}

export async function criarTurma(formData: FormData) {
  const { paroquia, user } = await guard();
  const d = z
    .object({
      etapaId: z.uuid(),
      comunidadeId: z.union([z.uuid(), z.literal("")]),
      nome: z.string().trim().min(1).max(100),
      ano: z.coerce.number().int().min(2000).max(2100),
      diaSemana: z.coerce.number().int().min(0).max(6),
      hora: z.string().regex(/^\d{2}:\d{2}$/),
      vagas: z.coerce.number().int().min(1).max(200),
    })
    .parse(Object.fromEntries(formData));
  await exigirDaParoquia(etapasCatequese, d.etapaId, paroquia.id);
  if (d.comunidadeId) await exigirDaParoquia(comunidades, d.comunidadeId, paroquia.id);
  await db.insert(turmasCatequese).values({
    ...d,
    comunidadeId: d.comunidadeId || null,
    paroquiaId: paroquia.id,
    createdBy: user.id,
  });
  refresh();
}

export async function adicionarCatequista(formData: FormData) {
  const { paroquia, user } = await guard();
  const d = z.object({ turmaId: z.uuid(), pessoaId: z.uuid() }).parse(Object.fromEntries(formData));
  await exigirDaParoquia(turmasCatequese, d.turmaId, paroquia.id);
  await exigirDaParoquia(pessoas, d.pessoaId, paroquia.id);
  const [existe] = await db
    .select({ id: turmaCatequistas.id })
    .from(turmaCatequistas)
    .where(and(eq(turmaCatequistas.turmaId, d.turmaId), eq(turmaCatequistas.pessoaId, d.pessoaId)));
  if (existe) return;
  await db.insert(turmaCatequistas).values({ ...d, paroquiaId: paroquia.id, createdBy: user.id });
  refresh();
}

export async function removerCatequista(formData: FormData) {
  const { paroquia } = await guard();
  const id = z.uuid().parse(formData.get("id"));
  await db.delete(turmaCatequistas).where(and(eq(turmaCatequistas.id, id), eq(turmaCatequistas.paroquiaId, paroquia.id)));
  refresh();
}

/** Vagas contam só matrículas ativas; a mesma pessoa não entra duas vezes na turma. */
async function matricularEm(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], paroquiaId: string, turmaId: string, pessoaId: string, userId: string) {
  const [turma] = await tx
    .select()
    .from(turmasCatequese)
    .where(and(eq(turmasCatequese.id, turmaId), eq(turmasCatequese.paroquiaId, paroquiaId)))
    .for("update");
  if (!turma) throw new Error("Turma não encontrada");
  const [existe] = await tx
    .select({ id: matriculasCatequese.id })
    .from(matriculasCatequese)
    .where(and(eq(matriculasCatequese.turmaId, turmaId), eq(matriculasCatequese.pessoaId, pessoaId)));
  if (existe) return false;
  const [{ n }] = await tx
    .select({ n: count() })
    .from(matriculasCatequese)
    .where(and(eq(matriculasCatequese.turmaId, turmaId), eq(matriculasCatequese.status, "ativa")));
  if (n >= turma.vagas) throw new Error("A turma não tem mais vagas");
  await tx.insert(matriculasCatequese).values({ paroquiaId, turmaId, pessoaId, createdBy: userId });
  return true;
}

export async function matricular(formData: FormData) {
  const { paroquia, user } = await guard();
  const d = z.object({ turmaId: z.uuid(), pessoaId: z.uuid() }).parse(Object.fromEntries(formData));
  await exigirDaParoquia(pessoas, d.pessoaId, paroquia.id);
  await db.transaction((tx) => matricularEm(tx, paroquia.id, d.turmaId, d.pessoaId, user.id));
  refresh();
}

export async function mudarStatusMatricula(formData: FormData) {
  const { paroquia } = await guard();
  const d = z.object({ id: z.uuid(), status: z.enum(["ativa", "concluida", "desistente"]) }).parse(Object.fromEntries(formData));
  await db
    .update(matriculasCatequese)
    .set({ status: d.status })
    .where(and(eq(matriculasCatequese.id, d.id), eq(matriculasCatequese.paroquiaId, paroquia.id)));
  refresh();
}

export async function alternarDocumentoMatricula(formData: FormData) {
  const { paroquia } = await guard();
  const id = z.uuid().parse(formData.get("id"));
  const [m] = await db
    .select()
    .from(matriculasCatequese)
    .where(and(eq(matriculasCatequese.id, id), eq(matriculasCatequese.paroquiaId, paroquia.id)));
  if (!m) throw new Error("Matrícula não encontrada");
  await db.update(matriculasCatequese).set({ documentoPendente: !m.documentoPendente }).where(eq(matriculasCatequese.id, id));
  refresh();
}

/** Rematrícula: leva os catequizandos ativos da turma de origem para a de destino e conclui a matrícula antiga. */
export async function rematricular(formData: FormData) {
  const { paroquia, user } = await guard();
  const d = z.object({ origemId: z.uuid(), destinoId: z.uuid() }).parse(Object.fromEntries(formData));
  if (d.origemId === d.destinoId) throw new Error("Escolha uma turma de destino diferente");
  await exigirDaParoquia(turmasCatequese, d.origemId, paroquia.id);
  await db.transaction(async (tx) => {
    const ativas = await tx
      .select()
      .from(matriculasCatequese)
      .where(and(eq(matriculasCatequese.turmaId, d.origemId), eq(matriculasCatequese.status, "ativa")));
    for (const m of ativas) {
      await matricularEm(tx, paroquia.id, d.destinoId, m.pessoaId, user.id);
      await tx.update(matriculasCatequese).set({ status: "concluida" }).where(eq(matriculasCatequese.id, m.id));
    }
  });
  refresh();
}
