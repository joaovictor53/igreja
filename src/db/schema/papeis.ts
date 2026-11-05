import { pgTable, text, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { tenant } from "./base";

/**
 * Papéis por paróquia. `chave` é o que fica em membros_paroquia.papel: o nome de um papel
 * de sistema ("paroco", "secretaria"...) ou "c_xxxxxxxx" para papéis criados pela paróquia.
 * Papel de sistema sem linha aqui usa as permissões padrão (src/lib/permissoes.ts).
 */
export const papeis = pgTable(
  "papeis",
  {
    ...tenant(),
    chave: text("chave").notNull(),
    nome: text("nome").notNull(),
    permissoes: jsonb("permissoes").$type<string[]>().notNull().default([]),
  },
  (t) => [uniqueIndex("papeis_paroquia_chave_uniq").on(t.paroquiaId, t.chave)],
);
