import { pgTable, customType, uuid, text, timestamp, jsonb, boolean, date, integer, index, uniqueIndex } from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

const audit = {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: text("created_by"),
};

export const paroquias = pgTable("paroquias", {
  ...audit,
  slug: text("slug").notNull().unique(),
  nome: text("nome").notNull(),
  cnpj: text("cnpj"),
  jurisdicaoTipo: text("jurisdicao_tipo"),
  jurisdicaoNome: text("jurisdicao_nome"),
  fuso: text("fuso").notNull().default("America/Manaus"),
  config: jsonb("config").notNull().default({}),
});

export const tenant = () => ({
  ...audit,
  paroquiaId: uuid("paroquia_id").notNull().references(() => paroquias.id, { onDelete: "cascade" }),
});

export const comunidades = pgTable(
  "comunidades",
  {
    ...tenant(),
    nome: text("nome").notNull(),
    // endereço da página pública: /{paróquia}/comunidade/{slug}
    slug: text("slug").notNull(),
    descricao: text("descricao"),
    telefone: text("telefone"),
    // só dígitos com DDI (ex.: 5592999990000)
    whatsapp: text("whatsapp"),
    // link do Google Maps (ou similar) para a página pública
    mapaUrl: text("mapa_url"),
    // quando a foto foi enviada; vazio = sem foto. Serve para invalidar o cache.
    fotoEm: timestamp("foto_em", { withTimezone: true }),
    endereco: text("endereco"),
    responsavelPessoaId: uuid("responsavel_pessoa_id"),
  },
  (t) => [uniqueIndex("comunidades_paroquia_slug_uniq").on(t.paroquiaId, t.slug)],
);

export const comunidadeFotos = pgTable("comunidade_fotos", {
  comunidadeId: uuid("comunidade_id").primaryKey().references(() => comunidades.id, { onDelete: "cascade" }),
  tipo: text("tipo").notNull(),
  dados: bytea("dados").notNull(),
});

export const familias = pgTable("familias", {
  ...tenant(),
  nome: text("nome").notNull(),
  endereco: text("endereco"),
});

export const pessoas = pgTable(
  "pessoas",
  {
    ...tenant(),
    nome: text("nome").notNull(),
    nomeBusca: text("nome_busca").notNull(),
    nascimento: date("nascimento"),
    sexo: text("sexo"),
    telefone: text("telefone"),
    email: text("email"),
    comunidadeId: uuid("comunidade_id").references(() => comunidades.id),
    familiaId: uuid("familia_id").references(() => familias.id),
  },
  (t) => [index("pessoas_paroquia_nome_idx").on(t.paroquiaId, t.nomeBusca)],
);

// usuarioId referencia a tabela "user" do better-auth (gerada pelo CLI)
export const membrosParoquia = pgTable(
  "membros_paroquia",
  {
    ...tenant(),
    usuarioId: text("usuario_id").notNull(),
    // chave de um papel (ver tabela "papeis"): de sistema ou criado pela paróquia
    papel: text("papel").notNull(),
    pessoaId: uuid("pessoa_id").references(() => pessoas.id),
  },
  (t) => [uniqueIndex("membros_paroquia_uniq").on(t.paroquiaId, t.usuarioId)],
);

export const pastorais = pgTable("pastorais", {
  ...tenant(),
  nome: text("nome").notNull(),
});

export const pastoralMembros = pgTable("pastoral_membros", {
  ...tenant(),
  pastoralId: uuid("pastoral_id").notNull().references(() => pastorais.id, { onDelete: "cascade" }),
  pessoaId: uuid("pessoa_id").notNull().references(() => pessoas.id, { onDelete: "cascade" }),
  coordenador: boolean("coordenador").notNull().default(false),
});

export const horariosRecorrentes = pgTable("horarios_recorrentes", {
  ...tenant(),
  comunidadeId: uuid("comunidade_id").notNull().references(() => comunidades.id),
  rrule: text("rrule").notNull(),
  tipo: text("tipo").notNull().default("missa"),
  duracaoMin: integer("duracao_min").notNull().default(60),
});

export const celebracoes = pgTable(
  "celebracoes",
  {
    ...tenant(),
    horarioId: uuid("horario_id").references(() => horariosRecorrentes.id, { onDelete: "set null" }),
    comunidadeId: uuid("comunidade_id").notNull().references(() => comunidades.id),
    inicio: timestamp("inicio", { withTimezone: true }).notNull(),
    tipo: text("tipo").notNull().default("missa"),
    status: text("status", { enum: ["agendada", "cancelada", "realizada"] }).notNull().default("agendada"),
    celebrante: text("celebrante"),
    limiteIntencoes: integer("limite_intencoes"),
  },
  (t) => [
    index("celebracoes_paroquia_inicio_idx").on(t.paroquiaId, t.inicio),
    uniqueIndex("celebracoes_horario_inicio_uniq").on(t.horarioId, t.inicio),
  ],
);

export const intencoes = pgTable("intencoes", {
  ...tenant(),
  celebracaoId: uuid("celebracao_id").notNull().references(() => celebracoes.id),
  tipo: text("tipo", { enum: ["falecido", "acao_de_gracas", "saude", "aniversario", "outras"] }).notNull(),
  texto: text("texto").notNull(),
  solicitanteNome: text("solicitante_nome"),
  solicitanteContato: text("solicitante_contato"),
});

export const agendas = pgTable("agendas", {
  ...tenant(),
  nome: text("nome").notNull(),
  visibilidade: text("visibilidade", { enum: ["publica", "privada", "restrita"] }).notNull().default("publica"),
});

export const eventos = pgTable("eventos", {
  ...tenant(),
  agendaId: uuid("agenda_id").notNull().references(() => agendas.id, { onDelete: "cascade" }),
  titulo: text("titulo").notNull(),
  local: text("local"),
  inicio: timestamp("inicio", { withTimezone: true }).notNull(),
  fim: timestamp("fim", { withTimezone: true }),
  rrule: text("rrule"),
  celebracaoId: uuid("celebracao_id").references(() => celebracoes.id, { onDelete: "cascade" }),
  // evento de uma comunidade (festa, atividade); vazio = evento da paróquia toda
  comunidadeId: uuid("comunidade_id").references(() => comunidades.id, { onDelete: "set null" }),
});
