import { pgTable, uuid, text, integer, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import type { Campo, Dados } from "@/lib/formularios";
import { pessoas, tenant } from "./base";

export const formularios = pgTable("formularios", {
  ...tenant(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  campos: jsonb("campos").$type<Campo[]>().notNull(),
  abreEm: timestamp("abre_em", { withTimezone: true }),
  fechaEm: timestamp("fecha_em", { withTimezone: true }),
  limite: integer("limite"),
  ativo: boolean("ativo").notNull().default(true),
  modeloOrigem: text("modelo_origem"),
});

export const respostas = pgTable(
  "respostas",
  {
    ...tenant(),
    formularioId: uuid("formulario_id").notNull().references(() => formularios.id, { onDelete: "cascade" }),
    dados: jsonb("dados").$type<Dados>().notNull(),
    status: text("status", { enum: ["nova", "em_analise", "aceita", "recusada"] }).notNull().default("nova"),
    pessoaId: uuid("pessoa_id").references(() => pessoas.id, { onDelete: "set null" }),
  },
  (t) => [index("respostas_formulario_idx").on(t.formularioId, t.createdAt)],
);

export const pedidosPastorais = pgTable("pedidos_pastorais", {
  ...tenant(),
  tipo: text("tipo", { enum: ["uncao_enfermos", "bencao", "conversa_padre", "confissao"] }).notNull(),
  urgente: boolean("urgente").notNull().default(false),
  solicitanteNome: text("solicitante_nome").notNull(),
  contato: text("contato").notNull(),
  endereco: text("endereco"),
  descricao: text("descricao"),
  atribuidoA: text("atribuido_a"), // id do usuário (better-auth) do padre/diácono
  status: text("status", { enum: ["novo", "em_andamento", "concluido", "cancelado"] }).notNull().default("novo"),
});
