"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { celebracoes, comunidades, horariosRecorrentes } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { montarRrule, ocorrencias } from "@/lib/datas";

const MESES_A_FRENTE = 3;

const horarioSchema = z.object({
  comunidadeId: z.uuid(),
  diaSemana: z.coerce.number().int().min(0).max(6),
  hora: z.string().regex(/^\d{2}:\d{2}$/),
  tipo: z.string().trim().min(1).default("missa"),
});

export async function criarHorario(formData: FormData) {
  const { paroquia, user } = await requireParoquia("liturgia:gerir");
  const d = horarioSchema.parse(Object.fromEntries(formData));
  const [comunidade] = await db
    .select({ id: comunidades.id })
    .from(comunidades)
    .where(and(eq(comunidades.id, d.comunidadeId), eq(comunidades.paroquiaId, paroquia.id)));
  if (!comunidade) throw new Error("Comunidade inválida");
  const [h, m] = d.hora.split(":").map(Number);
  const [horario] = await db
    .insert(horariosRecorrentes)
    .values({
      paroquiaId: paroquia.id,
      comunidadeId: comunidade.id,
      tipo: d.tipo,
      rrule: montarRrule(d.diaSemana, h, m),
      createdBy: user.id,
    })
    .returning();
  await gerar(paroquia.id, paroquia.fuso, horario);
  revalidatePath("/painel/liturgia/horarios");
  revalidatePath("/painel/liturgia/celebracoes");
}

export async function gerarCelebracoes() {
  const { paroquia } = await requireParoquia("liturgia:gerir");
  const horarios = await db.select().from(horariosRecorrentes).where(eq(horariosRecorrentes.paroquiaId, paroquia.id));
  for (const h of horarios) await gerar(paroquia.id, paroquia.fuso, h);
  revalidatePath("/painel/liturgia/celebracoes");
}

async function gerar(paroquiaId: string, fuso: string, h: typeof horariosRecorrentes.$inferSelect) {
  const datas = ocorrencias(h.rrule, fuso, MESES_A_FRENTE);
  if (!datas.length) return;
  await db
    .insert(celebracoes)
    .values(datas.map((inicio) => ({ paroquiaId, horarioId: h.id, comunidadeId: h.comunidadeId, inicio, tipo: h.tipo })))
    .onConflictDoNothing();
}

export async function cancelarCelebracao(formData: FormData) {
  const { paroquia } = await requireParoquia("liturgia:gerir");
  const id = z.uuid().parse(formData.get("id"));
  await db
    .update(celebracoes)
    .set({ status: "cancelada", updatedAt: new Date() })
    .where(and(eq(celebracoes.id, id), eq(celebracoes.paroquiaId, paroquia.id)));
  revalidatePath("/painel/liturgia/celebracoes");
}
