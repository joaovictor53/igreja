import "server-only";
import webpush from "web-push";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { endpointPushPermitido } from "@/lib/push";
import { papeisComPermissao } from "@/server/permissoes";
import { funcaoMembros, membrosParoquia, notificacoes, pushSubscriptions } from "@/db/schema";

export type Aviso = { titulo: string; corpo: string; url?: string };

let configurado: boolean | null = null;
function configurarVapid() {
  if (configurado !== null) return configurado;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  configurado = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT);
  if (configurado) webpush.setVapidDetails(VAPID_SUBJECT!, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
  else console.warn("[push] VAPID não configurado: só notificações dentro do sistema");
  return configurado;
}

/** Só aceita caminhos internos, para um aviso nunca levar a outro site. */
const urlInterna = (u?: string) => (u && u.startsWith("/") && !u.startsWith("//") ? u : "/painel");

/**
 * Grava a notificação dentro do sistema e tenta o Web Push. Chamar DEPOIS de a ação principal
 * ser confirmada. Falha de push nunca derruba a ação: só é registrada no log.
 */
export async function notificar(paroquiaId: string, usuarioIds: string[], aviso: Aviso) {
  const destinatarios = [...new Set(usuarioIds)];
  if (!destinatarios.length) return;
  const url = urlInterna(aviso.url);

  await db.insert(notificacoes).values(
    destinatarios.map((usuarioId) => ({ paroquiaId, usuarioId, titulo: aviso.titulo, corpo: aviso.corpo, url })),
  );
  if (!configurarVapid()) return;

  const todas = await db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.usuarioId, destinatarios));
  // inscrições antigas podem ter sido gravadas antes da lista de serviços permitidos
  const subs = todas.filter((s) => endpointPushPermitido(s.endpoint));
  const payload = JSON.stringify({ titulo: aviso.titulo, corpo: aviso.corpo, url });
  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          TTL: 60 * 60,
          timeout: 8000,
        });
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // inscrição expirada ou revogada pelo navegador
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.id));
        } else {
          console.warn("[push] falha ao enviar:", status ?? (e as Error).message);
        }
      }
    }),
  );
}

/** Contas vinculadas a pessoas que exercem a função (menos quem está pedindo/assumindo). */
export async function usuariosDaFuncao(funcaoId: string, exceto: string[] = []) {
  const rows = await db
    .select({ usuarioId: membrosParoquia.usuarioId, pessoaId: membrosParoquia.pessoaId })
    .from(funcaoMembros)
    .innerJoin(membrosParoquia, eq(membrosParoquia.pessoaId, funcaoMembros.pessoaId))
    .where(eq(funcaoMembros.funcaoId, funcaoId));
  return rows.filter((r) => r.pessoaId && !exceto.includes(r.pessoaId)).map((r) => r.usuarioId);
}

/** Quem gerencia as escalas: recebe o aviso de que uma troca foi concluída. */
export async function gestoresDaParoquia(paroquiaId: string) {
  const papeisAlvo = await papeisComPermissao(paroquiaId, "alertas:receber");
  const rows = await db
    .select({ usuarioId: membrosParoquia.usuarioId })
    .from(membrosParoquia)
    .where(and(eq(membrosParoquia.paroquiaId, paroquiaId), inArray(membrosParoquia.papel, papeisAlvo)));
  return rows.map((r) => r.usuarioId);
}

export async function usuarioDaPessoa(paroquiaId: string, pessoaId: string) {
  const [r] = await db
    .select({ usuarioId: membrosParoquia.usuarioId })
    .from(membrosParoquia)
    .where(and(eq(membrosParoquia.paroquiaId, paroquiaId), eq(membrosParoquia.pessoaId, pessoaId)));
  return r?.usuarioId ?? null;
}
