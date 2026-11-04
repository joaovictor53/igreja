import { pgTable, uuid, text, integer, date, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { pessoas, tenant } from "./base";

import { PAPEIS_ASSENTO, TIPOS_LIVRO } from "@/lib/registros-constantes";

export { PAPEIS_ASSENTO, TIPOS_LIVRO };

export const livros = pgTable(
  "livros",
  {
    ...tenant(),
    tipo: text("tipo", { enum: TIPOS_LIVRO }).notNull(),
    numero: integer("numero").notNull(),
    inicio: date("inicio"),
    fim: date("fim"),
  },
  (t) => [uniqueIndex("livros_paroquia_tipo_numero_uniq").on(t.paroquiaId, t.tipo, t.numero)],
);

export const assentos = pgTable(
  "assentos",
  {
    ...tenant(),
    livroId: uuid("livro_id").notNull().references(() => livros.id, { onDelete: "cascade" }),
    folha: text("folha").notNull(),
    termo: text("termo").notNull(),
    data: date("data").notNull(),
    celebrante: text("celebrante"),
    observacoes: text("observacoes"),
    /** nomes das pessoas do assento, sem acento e em minúsculas, para a busca */
    textoBusca: text("texto_busca").notNull().default(""),
  },
  (t) => [
    uniqueIndex("assentos_livro_folha_termo_uniq").on(t.livroId, t.folha, t.termo),
    index("assentos_paroquia_data_idx").on(t.paroquiaId, t.data),
  ],
);

export const assentoPessoas = pgTable("assento_pessoas", {
  ...tenant(),
  assentoId: uuid("assento_id").notNull().references(() => assentos.id, { onDelete: "cascade" }),
  papel: text("papel", { enum: PAPEIS_ASSENTO }).notNull(),
  nome: text("nome").notNull(),
  pessoaId: uuid("pessoa_id").references(() => pessoas.id, { onDelete: "set null" }),
});

export const averbacoes = pgTable("averbacoes", {
  ...tenant(),
  assentoId: uuid("assento_id").notNull().references(() => assentos.id, { onDelete: "cascade" }),
  data: date("data").notNull(),
  texto: text("texto").notNull(),
});

export const certidoes = pgTable(
  "certidoes",
  {
    ...tenant(),
    assentoId: uuid("assento_id").notNull().references(() => assentos.id, { onDelete: "restrict" }),
    codigo: text("codigo").notNull(),
    emitidaEm: timestamp("emitida_em", { withTimezone: true }).notNull().defaultNow(),
    emitidaPor: text("emitida_por").notNull(),
    finalidade: text("finalidade"),
    revogadaEm: timestamp("revogada_em", { withTimezone: true }),
    motivoRevogacao: text("motivo_revogacao"),
    /** retrato do que foi emitido: o PDF e a validação usam isto, não o assento atual */
    tipoRegistro: text("tipo_registro", { enum: TIPOS_LIVRO }).notNull(),
    nomeRegistrado: text("nome_registrado").notNull(),
    paragrafos: jsonb("paragrafos").$type<string[]>().notNull(),
    /** SHA-256 do conteúdo da certidão (texto + código + data de emissão) */
    hashConteudo: text("hash_conteudo").notNull(),
  },
  (t) => [uniqueIndex("certidoes_codigo_uniq").on(t.codigo)],
);
