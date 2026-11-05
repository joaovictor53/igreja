import "server-only";
import { headers } from "next/headers";
import { ipDoCliente } from "./ip";

const janelas = new Map<string, number[]>();

/**
 * Limite simples em memória, por IP e chave (ex.: "form"). Vale por instância do servidor;
 * com várias instâncias, trocar por um contador compartilhado (Postgres/Redis).
 */
export async function excedeuLimite(chave: string, max = 5, janelaMs = 60_000): Promise<boolean> {
  const h = await headers();
  // PROXY_HOPS = quantos proxies confiáveis ficam na frente do app (Railway: 1). Valores à esquerda vêm do cliente.
  const ip = ipDoCliente(h.get("x-forwarded-for"), Number(process.env.PROXY_HOPS) || 1);
  const id = `${chave}:${ip}`;
  const agora = Date.now();
  const recentes = (janelas.get(id) ?? []).filter((t) => agora - t < janelaMs);
  recentes.push(agora);
  janelas.set(id, recentes);
  if (janelas.size > 5000) for (const [k, v] of janelas) if (v.every((t) => agora - t >= janelaMs)) janelas.delete(k);
  return recentes.length > max;
}
