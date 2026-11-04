"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gt, lt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { espacos, reservas } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { exigirDaParoquia } from "@/server/tenant";
import { zonedToUtc } from "@/lib/datas";

const guard = () => requireParoquia(["admin", "paroco", "secretaria"]);
const refresh = () => revalidatePath("/painel/reservas");

export async function criarEspaco(formData: FormData) {
  const { paroquia, user } = await guard();
  const nome = z.string().trim().min(2).max(100).parse(formData.get("nome"));
  await db.insert(espacos).values({ paroquiaId: paroquia.id, nome, createdBy: user.id });
  refresh();
}

export async function criarReserva(formData: FormData) {
  const { paroquia, user } = await guard();
  const d = z
    .object({
      espacoId: z.uuid(),
      titulo: z.string().trim().min(2).max(200),
      solicitante: z.string().trim().min(2).max(120),
      data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      inicio: z.string().regex(/^\d{2}:\d{2}$/),
      fim: z.string().regex(/^\d{2}:\d{2}$/),
    })
    .parse(Object.fromEntries(formData));
  await exigirDaParoquia(espacos, d.espacoId, paroquia.id);
  const [y, m, dia] = d.data.split("-").map(Number);
  const [h1, m1] = d.inicio.split(":").map(Number);
  const [h2, m2] = d.fim.split(":").map(Number);
  const inicio = zonedToUtc(y, m, dia, h1, m1, paroquia.fuso);
  const fim = zonedToUtc(y, m, dia, h2, m2, paroquia.fuso);
  if (fim <= inicio) throw new Error("O horário final deve ser depois do inicial");
  await db.insert(reservas).values({
    paroquiaId: paroquia.id,
    espacoId: d.espacoId,
    titulo: d.titulo,
    solicitante: d.solicitante,
    inicio,
    fim,
    createdBy: user.id,
  });
  refresh();
}

/** Aprovar exige que nenhuma outra reserva aprovada ocupe o mesmo espaço no mesmo horário. */
export async function decidirReserva(formData: FormData) {
  const { paroquia } = await guard();
  const d = z.object({ id: z.uuid(), status: z.enum(["aprovada", "recusada"]) }).parse(Object.fromEntries(formData));
  await db.transaction(async (tx) => {
    const [r] = await tx.select().from(reservas).where(and(eq(reservas.id, d.id), eq(reservas.paroquiaId, paroquia.id)));
    if (!r) throw new Error("Reserva não encontrada");
    if (d.status === "aprovada") {
      const conflitos = await tx
        .select({ id: reservas.id })
        .from(reservas)
        .where(
          and(
            eq(reservas.espacoId, r.espacoId),
            eq(reservas.status, "aprovada"),
            lt(reservas.inicio, r.fim),
            gt(reservas.fim, r.inicio),
          ),
        );
      if (conflitos.some((c) => c.id !== r.id)) throw new Error("Conflito de horário com uma reserva já aprovada");
    }
    await tx.update(reservas).set({ status: d.status }).where(eq(reservas.id, d.id));
  });
  refresh();
}

export async function excluirReserva(formData: FormData) {
  const { paroquia } = await guard();
  const id = z.uuid().parse(formData.get("id"));
  await db.delete(reservas).where(and(eq(reservas.id, id), eq(reservas.paroquiaId, paroquia.id)));
  refresh();
}
