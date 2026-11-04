import { pgTable, uuid, text, integer, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { celebracoes, pessoas, tenant } from "./base";

export const funcoesEscala = pgTable("funcoes_escala", {
  ...tenant(),
  nome: text("nome").notNull(),
  vagas: integer("vagas").notNull().default(1),
});

export const funcaoMembros = pgTable(
  "funcao_membros",
  {
    ...tenant(),
    funcaoId: uuid("funcao_id").notNull().references(() => funcoesEscala.id, { onDelete: "cascade" }),
    pessoaId: uuid("pessoa_id").notNull().references(() => pessoas.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("funcao_membros_uniq").on(t.funcaoId, t.pessoaId)],
);

export const escalas = pgTable(
  "escalas",
  {
    ...tenant(),
    mes: text("mes").notNull(), // AAAA-MM
    status: text("status", { enum: ["rascunho", "publicada"] }).notNull().default("rascunho"),
  },
  (t) => [uniqueIndex("escalas_paroquia_mes_uniq").on(t.paroquiaId, t.mes)],
);

export const escalaItens = pgTable("escala_itens", {
  ...tenant(),
  escalaId: uuid("escala_id").notNull().references(() => escalas.id, { onDelete: "cascade" }),
  celebracaoId: uuid("celebracao_id").notNull().references(() => celebracoes.id, { onDelete: "cascade" }),
  funcaoId: uuid("funcao_id").notNull().references(() => funcoesEscala.id, { onDelete: "cascade" }),
  pessoaId: uuid("pessoa_id").references(() => pessoas.id, { onDelete: "set null" }),
  confirmado: boolean("confirmado").notNull().default(false),
});
