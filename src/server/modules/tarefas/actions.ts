"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { pessoas, tarefas } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { exigirDaParoquia } from "@/server/tenant";
import { linhasParaChecklist } from "@/lib/secretaria";

const guard = () => requireParoquia(["admin", "paroco", "secretaria"]);
const refresh = () => {
  revalidatePath("/painel/tarefas");
  revalidatePath("/painel");
};

export async function criarTarefa(formData: FormData) {
  const { paroquia, user } = await guard();
  const d = z
    .object({
      titulo: z.string().trim().min(2).max(200),
      responsavelPessoaId: z.union([z.uuid(), z.literal("")]),
      prazo: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]),
      checklist: z.string().max(2000),
    })
    .parse(Object.fromEntries(formData));
  if (d.responsavelPessoaId) await exigirDaParoquia(pessoas, d.responsavelPessoaId, paroquia.id);
  await db.insert(tarefas).values({
    paroquiaId: paroquia.id,
    titulo: d.titulo,
    responsavelPessoaId: d.responsavelPessoaId || null,
    prazo: d.prazo || null,
    checklist: linhasParaChecklist(d.checklist),
    createdBy: user.id,
  });
  refresh();
}

export async function alternarConclusao(formData: FormData) {
  const { paroquia } = await guard();
  const id = z.uuid().parse(formData.get("id"));
  const [t] = await db.select().from(tarefas).where(and(eq(tarefas.id, id), eq(tarefas.paroquiaId, paroquia.id)));
  if (!t) throw new Error("Tarefa não encontrada");
  await db.update(tarefas).set({ concluidaEm: t.concluidaEm ? null : new Date() }).where(eq(tarefas.id, id));
  refresh();
}

export async function alternarItemTarefa(formData: FormData) {
  const { paroquia } = await guard();
  const d = z.object({ id: z.uuid(), indice: z.coerce.number().int().min(0) }).parse(Object.fromEntries(formData));
  const [t] = await db.select().from(tarefas).where(and(eq(tarefas.id, d.id), eq(tarefas.paroquiaId, paroquia.id)));
  if (!t?.checklist[d.indice]) throw new Error("Item não encontrado");
  const checklist = t.checklist.map((i, n) => (n === d.indice ? { ...i, feito: !i.feito } : i));
  await db.update(tarefas).set({ checklist }).where(eq(tarefas.id, d.id));
  refresh();
}

export async function excluirTarefa(formData: FormData) {
  const { paroquia } = await guard();
  const id = z.uuid().parse(formData.get("id"));
  await db.delete(tarefas).where(and(eq(tarefas.id, id), eq(tarefas.paroquiaId, paroquia.id)));
  refresh();
}
