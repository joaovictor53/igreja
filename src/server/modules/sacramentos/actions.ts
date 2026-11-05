"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { agendamentosSacramento, comunidades, datasSacramento } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { exigirDaParoquia } from "@/server/tenant";
import { zonedToUtc } from "@/lib/datas";
import { checklistInicial } from "@/lib/secretaria";

const guard = () => requireParoquia("sacramentos:gerir");
const refresh = () => {
  revalidatePath("/painel/sacramentos");
  revalidatePath("/painel");
};

export async function abrirData(formData: FormData) {
  const { paroquia, user } = await guard();
  const d = z
    .object({
      tipo: z.enum(["batizado", "casamento"]),
      data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      hora: z.string().regex(/^\d{2}:\d{2}$/),
      comunidadeId: z.union([z.uuid(), z.literal("")]),
      vagas: z.coerce.number().int().min(1).max(50),
    })
    .parse(Object.fromEntries(formData));
  if (d.comunidadeId) await exigirDaParoquia(comunidades, d.comunidadeId, paroquia.id);
  const [y, m, dia] = d.data.split("-").map(Number);
  const [h, min] = d.hora.split(":").map(Number);
  await db.insert(datasSacramento).values({
    paroquiaId: paroquia.id,
    tipo: d.tipo,
    inicio: zonedToUtc(y, m, dia, h, min, paroquia.fuso),
    comunidadeId: d.comunidadeId || null,
    vagas: d.vagas,
    createdBy: user.id,
  });
  refresh();
}

export async function excluirData(formData: FormData) {
  const { paroquia } = await guard();
  const id = z.uuid().parse(formData.get("id"));
  await db.delete(datasSacramento).where(and(eq(datasSacramento.id, id), eq(datasSacramento.paroquiaId, paroquia.id)));
  refresh();
}

export async function criarAgendamento(formData: FormData) {
  const { paroquia, user } = await guard();
  const d = z
    .object({
      dataId: z.uuid(),
      envolvidos: z.string().trim().min(2).max(200),
      contato: z.string().trim().min(8).max(60),
    })
    .parse(Object.fromEntries(formData));
  await db.transaction(async (tx) => {
    const [data] = await tx
      .select()
      .from(datasSacramento)
      .where(and(eq(datasSacramento.id, d.dataId), eq(datasSacramento.paroquiaId, paroquia.id)))
      .for("update");
    if (!data) throw new Error("Data não encontrada");
    const [{ ocupadas }] = await tx
      .select({ ocupadas: count() })
      .from(agendamentosSacramento)
      .where(and(eq(agendamentosSacramento.dataId, data.id), ne(agendamentosSacramento.status, "cancelado")));
    if (ocupadas >= data.vagas) throw new Error("Esta data não tem mais vagas");
    await tx.insert(agendamentosSacramento).values({
      paroquiaId: paroquia.id,
      dataId: data.id,
      envolvidos: d.envolvidos,
      contato: d.contato,
      documentos: checklistInicial(data.tipo),
      createdBy: user.id,
    });
  });
  refresh();
}

export async function alternarDocumento(formData: FormData) {
  const { paroquia } = await guard();
  const d = z.object({ id: z.uuid(), indice: z.coerce.number().int().min(0) }).parse(Object.fromEntries(formData));
  const [a] = await db
    .select()
    .from(agendamentosSacramento)
    .where(and(eq(agendamentosSacramento.id, d.id), eq(agendamentosSacramento.paroquiaId, paroquia.id)));
  if (!a?.documentos[d.indice]) throw new Error("Documento não encontrado");
  const documentos = a.documentos.map((i, n) => (n === d.indice ? { ...i, feito: !i.feito } : i));
  await db.update(agendamentosSacramento).set({ documentos }).where(eq(agendamentosSacramento.id, d.id));
  refresh();
}

export async function alternarCurso(formData: FormData) {
  const { paroquia } = await guard();
  const id = z.uuid().parse(formData.get("id"));
  const [a] = await db
    .select()
    .from(agendamentosSacramento)
    .where(and(eq(agendamentosSacramento.id, id), eq(agendamentosSacramento.paroquiaId, paroquia.id)));
  if (!a) throw new Error("Agendamento não encontrado");
  await db.update(agendamentosSacramento).set({ cursoConcluido: !a.cursoConcluido }).where(eq(agendamentosSacramento.id, id));
  refresh();
}

export async function mudarStatusAgendamento(formData: FormData) {
  const { paroquia } = await guard();
  const d = z
    .object({ id: z.uuid(), status: z.enum(["solicitado", "confirmado", "realizado", "cancelado"]) })
    .parse(Object.fromEntries(formData));
  await db
    .update(agendamentosSacramento)
    .set({ status: d.status })
    .where(and(eq(agendamentosSacramento.id, d.id), eq(agendamentosSacramento.paroquiaId, paroquia.id)));
  refresh();
}
