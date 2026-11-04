import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { ACOES_AUDITADAS, TABELAS_AUDITADAS } from "@/lib/auditoria-constantes";
import { paroquias } from "./base";

const tabelas = Object.keys(TABELAS_AUDITADAS) as [keyof typeof TABELAS_AUDITADAS, ...(keyof typeof TABELAS_AUDITADAS)[]];
const acoes = Object.keys(ACOES_AUDITADAS) as [keyof typeof ACOES_AUDITADAS, ...(keyof typeof ACOES_AUDITADAS)[]];

/**
 * Trilha de auditoria. Só aceita inserção: um gatilho no banco rejeita UPDATE e DELETE
 * (ver migration). Guarda o id do usuário (better-auth) e dados em jsonb, não chaves estrangeiras,
 * para o histórico sobreviver à exclusão dos registros originais.
 */
export const auditoria = pgTable(
  "auditoria",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paroquiaId: uuid("paroquia_id").notNull().references(() => paroquias.id),
    usuarioId: text("usuario_id").notNull(),
    tabela: text("tabela", { enum: tabelas }).notNull(),
    registroId: uuid("registro_id").notNull(),
    acao: text("acao", { enum: acoes }).notNull(),
    antes: jsonb("antes"),
    depois: jsonb("depois"),
    em: timestamp("em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("auditoria_paroquia_em_idx").on(t.paroquiaId, t.em),
    index("auditoria_registro_idx").on(t.tabela, t.registroId),
  ],
);
