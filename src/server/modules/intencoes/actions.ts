"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { celebracoes, intencoes } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";


const schema = z.object({
  celebracaoId: z.uuid(),
  tipo: z.enum(["falecido", "acao_de_gracas", "saude", "aniversario", "outras"]),
  texto: z.string().trim().min(2, "Informe a intenção"),
  solicitanteNome: z.string().trim().optional(),
  solicitanteContato: z.string().trim().optional(),
});

export type IntencaoState = { erro?: string; aviso?: string; ok?: boolean };

export async function criarIntencao(_: IntencaoState, formData: FormData): Promise<IntencaoState> {
  const { paroquia, user } = await requireParoquia("liturgia:gerir");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };
  const d = parsed.data;

  const [cel] = await db
    .select()
    .from(celebracoes)
    .where(and(eq(celebracoes.id, d.celebracaoId), eq(celebracoes.paroquiaId, paroquia.id)));
  if (!cel) return { erro: "Celebração inválida" };

  await db.insert(intencoes).values({ ...d, paroquiaId: paroquia.id, createdBy: user.id });

  const [{ total }] = await db.select({ total: count() }).from(intencoes).where(eq(intencoes.celebracaoId, cel.id));
  revalidatePath(`/painel/liturgia/intencoes/${cel.id}`);
  if (cel.limiteIntencoes && total >= cel.limiteIntencoes)
    return { ok: true, aviso: `Limite de ${cel.limiteIntencoes} intenções atingido nesta celebração` };
  return { ok: true };
}

export async function excluirIntencao(formData: FormData) {
  const { paroquia } = await requireParoquia("liturgia:gerir");
  const id = z.uuid().parse(formData.get("id"));
  const [row] = await db
    .delete(intencoes)
    .where(and(eq(intencoes.id, id), eq(intencoes.paroquiaId, paroquia.id)))
    .returning({ celebracaoId: intencoes.celebracaoId });
  if (row) revalidatePath(`/painel/liturgia/intencoes/${row.celebracaoId}`);
}
