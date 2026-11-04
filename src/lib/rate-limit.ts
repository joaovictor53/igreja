import "server-only";
import { headers } from "next/headers";

const janelas = new Map<string, number[]>();

/**
 * Limite simples em memória, por IP e chave (ex.: "form"). Vale por instância do servidor;
 * com várias instâncias, trocar por um contador compartilhado (Postgres/Redis).
 */
export async function excedeuLimite(chave: string, max = 5, janelaMs = 60_000): Promise<boolean> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const id = `${chave}:${ip}`;
  const agora = Date.now();
  const recentes = (janelas.get(id) ?? []).filter((t) => agora - t < janelaMs);
  recentes.push(agora);
  janelas.set(id, recentes);
  if (janelas.size > 5000) for (const [k, v] of janelas) if (v.every((t) => agora - t >= janelaMs)) janelas.delete(k);
  return recentes.length > max;
}
