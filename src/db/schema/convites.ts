import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { pessoas, tenant } from "./base";

export const convites = pgTable("convites", {
  ...tenant(),
  pessoaId: uuid("pessoa_id").notNull().references(() => pessoas.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
  usadoEm: timestamp("usado_em", { withTimezone: true }),
  revogadoEm: timestamp("revogado_em", { withTimezone: true }),
  // papel que a conta recebe ao aceitar (chave de papel, ver tabela "papeis")
  papelInicial: text("papel_inicial").notNull().default("membro"),
});
