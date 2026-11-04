"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { membrosParoquia, paroquias, pedidosPastorais } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { excedeuLimite } from "@/lib/rate-limit";

export type PedidoState = { erro?: string; ok?: boolean };

const schema = z.object({
  slug: z.string().min(1).max(100),
  tipo: z.enum(["uncao_enfermos", "bencao", "conversa_padre", "confissao"]),
  urgente: z.string().optional(),
  solicitanteNome: z.string().trim().min(2, "Informe seu nome").max(120),
  contato: z.string().trim().min(8, "Informe um telefone para contato").max(60),
  endereco: z.string().trim().max(300).optional(),
  descricao: z.string().trim().max(2000).optional(),
});

/** Ação pública (sem login). A paróquia vem do slug, que é validado no servidor. */
export async function criarPedido(_: PedidoState, formData: FormData): Promise<PedidoState> {
  if (String(formData.get("website_url") ?? "")) return { ok: true };
  if (await excedeuLimite("pedido")) return { erro: "Muitas tentativas. Aguarde um minuto." };
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };
  const { slug, urgente, ...d } = parsed.data;
  const [paroquia] = await db.select({ id: paroquias.id }).from(paroquias).where(eq(paroquias.slug, slug));
  if (!paroquia) return { erro: "Paróquia não encontrada" };
  await db.insert(pedidosPastorais).values({ ...d, urgente: urgente === "on", paroquiaId: paroquia.id });
  revalidatePath("/painel/pedidos");
  return { ok: true };
}

const PAPEIS = ["admin", "paroco", "secretaria"] as const;

export async function atualizarPedido(formData: FormData) {
  const { paroquia } = await requireParoquia([...PAPEIS]);
  const d = z
    .object({
      id: z.uuid(),
      status: z.enum(["novo", "em_andamento", "concluido", "cancelado"]),
      atribuidoA: z.string().optional(),
    })
    .parse(Object.fromEntries(formData));
  let atribuidoA: string | null = null;
  if (d.atribuidoA) {
    // só pode atribuir a quem é pároco/admin desta paróquia
    const [m] = await db
      .select({ id: membrosParoquia.id })
      .from(membrosParoquia)
      .where(
        and(
          eq(membrosParoquia.paroquiaId, paroquia.id),
          eq(membrosParoquia.usuarioId, d.atribuidoA),
          inArray(membrosParoquia.papel, ["admin", "paroco"]),
        ),
      );
    if (!m) throw new Error("Responsável inválido");
    atribuidoA = d.atribuidoA;
  }
  await db
    .update(pedidosPastorais)
    .set({ status: d.status, atribuidoA, updatedAt: new Date() })
    .where(and(eq(pedidosPastorais.id, d.id), eq(pedidosPastorais.paroquiaId, paroquia.id)));
  revalidatePath("/painel/pedidos");
}
