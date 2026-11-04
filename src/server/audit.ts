import "server-only";
import { db } from "@/db";
import { auditoria } from "@/db/schema";
import type { AcaoAuditada, TabelaAuditada } from "@/lib/auditoria-constantes";

type Transacao = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type EntradaAuditoria = {
  paroquiaId: string;
  usuarioId: string;
  tabela: TabelaAuditada;
  registroId: string;
  acao: AcaoAuditada;
  antes?: unknown;
  depois?: unknown;
};

/**
 * Registra uma ação sensível. Passe a transação da própria ação (`tx`) para que
 * a mudança e o seu registro de auditoria sejam gravados juntos, ou nenhum dos dois.
 */
export async function auditar(exec: typeof db | Transacao, e: EntradaAuditoria) {
  await exec.insert(auditoria).values({
    paroquiaId: e.paroquiaId,
    usuarioId: e.usuarioId,
    tabela: e.tabela,
    registroId: e.registroId,
    acao: e.acao,
    antes: e.antes ?? null,
    depois: e.depois ?? null,
  });
}
