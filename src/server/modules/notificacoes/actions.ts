"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { notificacoes, pushSubscriptions } from "@/db/schema";
import { requireUser } from "@/server/auth/session";

export async function marcarTodasLidas() {
  const user = await requireUser();
  await db
    .update(notificacoes)
    .set({ lidaEm: new Date() })
    .where(and(eq(notificacoes.usuarioId, user.id), isNull(notificacoes.lidaEm)));
  revalidatePath("/painel", "layout");
}

const inscricao = z.object({
  endpoint: z.url().refine((u) => u.startsWith("https://"), "endpoint precisa ser https"),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(10).max(100) }),
});

/** Guarda (ou atualiza) a inscrição de push deste navegador para o usuário logado. */
export async function salvarInscricaoPush(dados: unknown) {
  const user = await requireUser();
  const s = inscricao.parse(dados);
  await db
    .insert(pushSubscriptions)
    .values({ usuarioId: user.id, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth })
    // o mesmo navegador pode trocar de conta: o endpoint passa a pertencer a quem acabou de entrar
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { usuarioId: user.id, p256dh: s.keys.p256dh, auth: s.keys.auth } });
}

export async function removerInscricaoPush(endpoint: string) {
  const user = await requireUser();
  await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.usuarioId, user.id)));
}
