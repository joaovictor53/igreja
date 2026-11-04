import { sql } from "drizzle-orm";
import { pgTable, uuid, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { pessoas, tenant } from "./base";
import { escalaItens } from "./escalas";

export const trocas = pgTable(
  "trocas",
  {
    ...tenant(),
    escalaItemId: uuid("escala_item_id").notNull().references(() => escalaItens.id, { onDelete: "cascade" }),
    solicitantePessoaId: uuid("solicitante_pessoa_id").notNull().references(() => pessoas.id, { onDelete: "cascade" }),
    substitutoPessoaId: uuid("substituto_pessoa_id").references(() => pessoas.id, { onDelete: "set null" }),
    status: text("status", { enum: ["aberta", "concluida", "cancelada"] }).notNull().default("aberta"),
    concluidaEm: timestamp("concluida_em", { withTimezone: true }),
  },
  (t) => [
    // no máximo um pedido aberto por item da escala
    uniqueIndex("trocas_item_aberta_uniq").on(t.escalaItemId).where(sql`status = 'aberta'`),
    index("trocas_paroquia_status_idx").on(t.paroquiaId, t.status),
  ],
);

/** Central de notificações dentro do sistema. */
export const notificacoes = pgTable(
  "notificacoes",
  {
    ...tenant(),
    usuarioId: text("usuario_id").notNull(),
    titulo: text("titulo").notNull(),
    corpo: text("corpo").notNull(),
    url: text("url"),
    lidaEm: timestamp("lida_em", { withTimezone: true }),
  },
  (t) => [index("notificacoes_usuario_idx").on(t.usuarioId, t.createdAt)],
);

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuarioId: text("usuario_id").notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
