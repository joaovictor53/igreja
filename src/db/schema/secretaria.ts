import { pgTable, uuid, text, integer, boolean, timestamp, date, jsonb, index } from "drizzle-orm/pg-core";
import type { ItemChecklist } from "@/lib/secretaria";
import { comunidades, pessoas, tenant } from "./base";

export const tarefas = pgTable(
  "tarefas",
  {
    ...tenant(),
    titulo: text("titulo").notNull(),
    responsavelPessoaId: uuid("responsavel_pessoa_id").references(() => pessoas.id, { onDelete: "set null" }),
    prazo: date("prazo"),
    checklist: jsonb("checklist").$type<ItemChecklist[]>().notNull().default([]),
    concluidaEm: timestamp("concluida_em", { withTimezone: true }),
  },
  (t) => [index("tarefas_paroquia_prazo_idx").on(t.paroquiaId, t.prazo)],
);

export const espacos = pgTable("espacos", {
  ...tenant(),
  nome: text("nome").notNull(),
});

export const reservas = pgTable(
  "reservas",
  {
    ...tenant(),
    espacoId: uuid("espaco_id").notNull().references(() => espacos.id, { onDelete: "cascade" }),
    titulo: text("titulo").notNull(),
    solicitante: text("solicitante").notNull(),
    inicio: timestamp("inicio", { withTimezone: true }).notNull(),
    fim: timestamp("fim", { withTimezone: true }).notNull(),
    status: text("status", { enum: ["pendente", "aprovada", "recusada"] }).notNull().default("pendente"),
  },
  (t) => [index("reservas_espaco_inicio_idx").on(t.espacoId, t.inicio)],
);

/** Datas que a paróquia abre para batizados e casamentos. */
export const datasSacramento = pgTable(
  "datas_sacramento",
  {
    ...tenant(),
    tipo: text("tipo", { enum: ["batizado", "casamento"] }).notNull(),
    inicio: timestamp("inicio", { withTimezone: true }).notNull(),
    comunidadeId: uuid("comunidade_id").references(() => comunidades.id),
    vagas: integer("vagas").notNull().default(1),
  },
  (t) => [index("datas_sacramento_paroquia_inicio_idx").on(t.paroquiaId, t.inicio)],
);

export const agendamentosSacramento = pgTable(
  "agendamentos_sacramento",
  {
    ...tenant(),
    dataId: uuid("data_id").notNull().references(() => datasSacramento.id, { onDelete: "cascade" }),
    envolvidos: text("envolvidos").notNull(), // criança, ou noivos
    contato: text("contato").notNull(),
    cursoConcluido: boolean("curso_concluido").notNull().default(false),
    documentos: jsonb("documentos").$type<ItemChecklist[]>().notNull().default([]),
    status: text("status", { enum: ["solicitado", "confirmado", "realizado", "cancelado"] }).notNull().default("solicitado"),
  },
  (t) => [index("agendamentos_sacramento_data_idx").on(t.dataId)],
);

export const etapasCatequese = pgTable("etapas_catequese", {
  ...tenant(),
  nome: text("nome").notNull(),
  ordem: integer("ordem").notNull().default(0),
});

export const turmasCatequese = pgTable(
  "turmas_catequese",
  {
    ...tenant(),
    etapaId: uuid("etapa_id").notNull().references(() => etapasCatequese.id),
    comunidadeId: uuid("comunidade_id").references(() => comunidades.id),
    ano: integer("ano").notNull(),
    nome: text("nome").notNull(),
    diaSemana: integer("dia_semana").notNull(),
    hora: text("hora").notNull(), // HH:MM
    vagas: integer("vagas").notNull().default(25),
  },
  (t) => [index("turmas_catequese_paroquia_ano_idx").on(t.paroquiaId, t.ano)],
);

export const turmaCatequistas = pgTable("turma_catequistas", {
  ...tenant(),
  turmaId: uuid("turma_id").notNull().references(() => turmasCatequese.id, { onDelete: "cascade" }),
  pessoaId: uuid("pessoa_id").notNull().references(() => pessoas.id, { onDelete: "cascade" }),
});

export const matriculasCatequese = pgTable(
  "matriculas_catequese",
  {
    ...tenant(),
    turmaId: uuid("turma_id").notNull().references(() => turmasCatequese.id, { onDelete: "cascade" }),
    pessoaId: uuid("pessoa_id").notNull().references(() => pessoas.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["ativa", "concluida", "desistente"] }).notNull().default("ativa"),
    documentoPendente: boolean("documento_pendente").notNull().default(true),
  },
  (t) => [index("matriculas_catequese_turma_idx").on(t.turmaId)],
);
