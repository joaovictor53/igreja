"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { agendas, eventos } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { zonedToUtc } from "@/lib/datas";


const schema = z.object({
  titulo: z.string().trim().min(2),
  local: z.string().trim().optional(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hora: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function criarEvento(formData: FormData) {
  const { paroquia, user } = await requireParoquia("agenda:gerir");
  const d = schema.parse(Object.fromEntries(formData));
  const [agenda] = await db
    .select({ id: agendas.id })
    .from(agendas)
    .where(and(eq(agendas.paroquiaId, paroquia.id), eq(agendas.visibilidade, "publica")))
    .limit(1);
  if (!agenda) throw new Error("Agenda pública não encontrada");
  const [y, m, dia] = d.data.split("-").map(Number);
  const [h, min] = d.hora.split(":").map(Number);
  await db.insert(eventos).values({
    paroquiaId: paroquia.id,
    agendaId: agenda.id,
    titulo: d.titulo,
    local: d.local || null,
    inicio: zonedToUtc(y, m, dia, h, min, paroquia.fuso),
    createdBy: user.id,
  });
  revalidatePath("/painel/agenda");
}

export async function excluirEvento(formData: FormData) {
  const { paroquia } = await requireParoquia("agenda:gerir");
  const id = z.uuid().parse(formData.get("id"));
  await db.delete(eventos).where(and(eq(eventos.id, id), eq(eventos.paroquiaId, paroquia.id)));
  revalidatePath("/painel/agenda");
}
