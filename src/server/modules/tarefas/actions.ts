"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, inArray, max, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  pessoas,
  tarefaAtividades,
  tarefaCategorias,
  tarefaChecklistItens,
  tarefaComentarios,
  tarefaResponsaveis,
  tarefas,
  user as usuarios,
} from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { exigirDaParoquia } from "@/server/tenant";
import {
  TAREFA_PRIORIDADES,
  TAREFA_STATUS,
  type TarefaStatus,
  type TipoAtividade,
} from "@/lib/tarefas";
import { KANBAN_CATEGORY_COLOR_IDS } from "@/lib/tarefas-cores";

export type TarefaResultado = { erro?: string };
type Exec = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

const refresh = () => {
  revalidatePath("/painel/tarefas");
  revalidatePath("/painel");
};

/** Quem gerencia vê e edita tudo; quem só "vê" age apenas nas tarefas em que é responsável ou que criou. */
async function contexto() {
  const c = await requireParoquia();
  const gerir = c.pode("tarefas:gerir");
  if (!gerir && !c.pode("tarefas:ver")) redirect("/painel");
  return { ...c, gerir };
}
type Contexto = Awaited<ReturnType<typeof contexto>>;

async function tarefaDaParoquia(exec: Exec, id: string, c: Contexto) {
  const [t] = await exec.select().from(tarefas).where(and(eq(tarefas.id, id), eq(tarefas.paroquiaId, c.paroquia.id)));
  return t ?? null;
}

async function podeAtuar(exec: Exec, t: { id: string; createdBy: string | null }, c: Contexto) {
  if (c.gerir || t.createdBy === c.user.id) return true;
  if (!c.pessoaId) return false;
  const [r] = await exec
    .select({ n: sql<number>`1` })
    .from(tarefaResponsaveis)
    .where(and(eq(tarefaResponsaveis.tarefaId, t.id), eq(tarefaResponsaveis.pessoaId, c.pessoaId)));
  return !!r;
}

/** Carrega a tarefa e confere se o usuário pode atuar nela. */
async function tarefaParaAtuar(exec: Exec, id: string, c: Contexto) {
  const t = await tarefaDaParoquia(exec, id, c);
  if (!t || !(await podeAtuar(exec, t, c))) return null;
  return t;
}

async function registrar(exec: Exec, c: Contexto, tarefaId: string, tipo: TipoAtividade, dados?: Record<string, unknown>) {
  await exec.insert(tarefaAtividades).values({ paroquiaId: c.paroquia.id, tarefaId, tipo, dados: dados ?? null, createdBy: c.user.id });
}

const NAO_ENCONTRADA = { erro: "Tarefa não encontrada" } as const;
const texto = (max: number) => z.string().trim().max(max);
const dataOpcional = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(""), z.null()]).optional();

async function pessoasValidas(exec: Exec, ids: string[], paroquiaId: string) {
  if (!ids.length) return [];
  const rows = await exec.select({ id: pessoas.id }).from(pessoas).where(and(inArray(pessoas.id, ids), eq(pessoas.paroquiaId, paroquiaId)));
  return rows.map((r) => r.id);
}

// ---------- tarefas

const novaSchema = z.object({
  titulo: texto(200).min(2, "Informe o título"),
  descricao: texto(5000).optional(),
  observacao: texto(5000).optional(),
  prioridade: z.enum(TAREFA_PRIORIDADES),
  prazo: dataOpcional,
  categoriaId: z.uuid().nullable().optional(),
  responsaveis: z.array(z.uuid()).max(50).default([]),
});

export async function criarTarefa(entrada: z.input<typeof novaSchema>): Promise<TarefaResultado> {
  const c = await contexto();
  const d = novaSchema.safeParse(entrada);
  if (!d.success) return { erro: d.error.issues[0].message };
  if (d.data.categoriaId) await exigirDaParoquia(tarefaCategorias, d.data.categoriaId, c.paroquia.id);
  // quem não gerencia só cria tarefas para si mesmo
  const quem = c.gerir ? d.data.responsaveis : c.pessoaId ? [c.pessoaId] : [];
  await db.transaction(async (tx) => {
    const responsaveis = await pessoasValidas(tx, quem, c.paroquia.id);
    const [t] = await tx
      .insert(tarefas)
      .values({
        paroquiaId: c.paroquia.id,
        titulo: d.data.titulo,
        descricao: d.data.descricao || null,
        observacao: d.data.observacao || null,
        prioridade: d.data.prioridade,
        prazo: d.data.prazo || null,
        categoriaId: d.data.categoriaId ?? null,
        createdBy: c.user.id,
      })
      .returning({ id: tarefas.id });
    if (responsaveis.length) await tx.insert(tarefaResponsaveis).values(responsaveis.map((pessoaId) => ({ tarefaId: t.id, pessoaId })));
    await registrar(tx, c, t.id, "TAREFA_CRIADA");
  });
  refresh();
  return {};
}

const edicaoSchema = z.object({
  id: z.uuid(),
  titulo: texto(200).min(2, "Informe o título"),
  descricao: texto(5000),
  observacao: texto(5000),
  prioridade: z.enum(TAREFA_PRIORIDADES),
  prazo: dataOpcional,
});

export async function atualizarTarefa(entrada: z.input<typeof edicaoSchema>): Promise<TarefaResultado> {
  const c = await contexto();
  if (!c.gerir) return { erro: "Sem permissão para editar a tarefa" };
  const d = edicaoSchema.safeParse(entrada);
  if (!d.success) return { erro: d.error.issues[0].message };
  await db.transaction(async (tx) => {
    const t = await tarefaDaParoquia(tx, d.data.id, c);
    if (!t) return;
    await tx
      .update(tarefas)
      .set({
        titulo: d.data.titulo,
        descricao: d.data.descricao || null,
        observacao: d.data.observacao || null,
        prioridade: d.data.prioridade,
        prazo: d.data.prazo || null,
        updatedAt: new Date(),
      })
      .where(eq(tarefas.id, t.id));
    if ((t.observacao ?? "") !== d.data.observacao) await registrar(tx, c, t.id, "OBSERVACAO_ATUALIZADA");
  });
  refresh();
  return {};
}

export async function mudarStatus(id: string, status: TarefaStatus): Promise<TarefaResultado> {
  const c = await contexto();
  if (!z.uuid().safeParse(id).success || !TAREFA_STATUS.includes(status)) return { erro: "Dados inválidos" };
  const erro = await db.transaction(async (tx) => {
    const t = await tarefaParaAtuar(tx, id, c);
    if (!t) return NAO_ENCONTRADA.erro;
    if (t.status === status) return null;
    await tx
      .update(tarefas)
      .set({ status, concluidaEm: status === "DONE" ? new Date() : null, updatedAt: new Date() })
      .where(eq(tarefas.id, t.id));
    await registrar(tx, c, t.id, "STATUS_ATUALIZADO", { de: t.status, para: status });
    return null;
  });
  if (erro) return { erro };
  refresh();
  return {};
}

export async function moverTarefa(id: string, categoriaId: string | null): Promise<TarefaResultado> {
  const c = await contexto();
  if (!c.gerir) return { erro: "Sem permissão para mover a tarefa" };
  if (!z.uuid().safeParse(id).success || (categoriaId !== null && !z.uuid().safeParse(categoriaId).success)) return { erro: "Dados inválidos" };
  const erro = await db.transaction(async (tx) => {
    const t = await tarefaDaParoquia(tx, id, c);
    if (!t) return NAO_ENCONTRADA.erro;
    if (t.categoriaId === categoriaId) return null;
    const nomes = new Map(
      (await tx.select({ id: tarefaCategorias.id, nome: tarefaCategorias.nome }).from(tarefaCategorias).where(eq(tarefaCategorias.paroquiaId, c.paroquia.id))).map((r) => [r.id, r.nome]),
    );
    if (categoriaId && !nomes.has(categoriaId)) return "Categoria não encontrada";
    await tx.update(tarefas).set({ categoriaId, updatedAt: new Date() }).where(eq(tarefas.id, t.id));
    await registrar(tx, c, t.id, "CATEGORIA_MOVIDA", {
      de: t.categoriaId ? nomes.get(t.categoriaId) ?? null : null,
      para: categoriaId ? nomes.get(categoriaId) ?? null : null,
    });
    return null;
  });
  if (erro) return { erro };
  refresh();
  return {};
}

export async function atribuirTarefa(id: string, responsaveis: string[]): Promise<TarefaResultado> {
  const c = await contexto();
  if (!c.gerir) return { erro: "Sem permissão para atribuir a tarefa" };
  const ids = z.array(z.uuid()).max(50).safeParse(responsaveis);
  if (!z.uuid().safeParse(id).success || !ids.success) return { erro: "Dados inválidos" };
  const erro = await db.transaction(async (tx) => {
    const t = await tarefaDaParoquia(tx, id, c);
    if (!t) return NAO_ENCONTRADA.erro;
    const validos = await pessoasValidas(tx, ids.data, c.paroquia.id);
    await tx.delete(tarefaResponsaveis).where(eq(tarefaResponsaveis.tarefaId, t.id));
    if (validos.length) await tx.insert(tarefaResponsaveis).values(validos.map((pessoaId) => ({ tarefaId: t.id, pessoaId })));
    await registrar(tx, c, t.id, "RESPONSAVEIS_ALTERADOS", { total: validos.length });
    return null;
  });
  if (erro) return { erro };
  refresh();
  return {};
}

export async function excluirTarefa(id: string): Promise<TarefaResultado> {
  const c = await contexto();
  if (!c.gerir) return { erro: "Sem permissão para excluir a tarefa" };
  if (!z.uuid().safeParse(id).success) return { erro: "Dados inválidos" };
  await db.delete(tarefas).where(and(eq(tarefas.id, id), eq(tarefas.paroquiaId, c.paroquia.id)));
  refresh();
  return {};
}

// ---------- categorias (colunas do quadro)

const categoriaSchema = z.object({
  nome: texto(60).min(1, "Informe o nome da categoria"),
  cor: z.enum(KANBAN_CATEGORY_COLOR_IDS).nullable().optional(),
});

export async function criarCategoria(entrada: z.input<typeof categoriaSchema>): Promise<TarefaResultado> {
  const c = await contexto();
  if (!c.gerir) return { erro: "Sem permissão para criar categorias" };
  const d = categoriaSchema.safeParse(entrada);
  if (!d.success) return { erro: d.error.issues[0].message };
  const [{ ultima }] = await db.select({ ultima: max(tarefaCategorias.ordem) }).from(tarefaCategorias).where(eq(tarefaCategorias.paroquiaId, c.paroquia.id));
  await db.insert(tarefaCategorias).values({
    paroquiaId: c.paroquia.id,
    nome: d.data.nome,
    cor: d.data.cor ?? null,
    ordem: (ultima ?? -1) + 1,
    createdBy: c.user.id,
  });
  refresh();
  return {};
}

export async function atualizarCategoria(id: string, entrada: z.input<typeof categoriaSchema>): Promise<TarefaResultado> {
  const c = await contexto();
  if (!c.gerir) return { erro: "Sem permissão para editar categorias" };
  const d = categoriaSchema.safeParse(entrada);
  if (!z.uuid().safeParse(id).success || !d.success) return { erro: d.success ? "Dados inválidos" : d.error.issues[0].message };
  await db
    .update(tarefaCategorias)
    .set({ nome: d.data.nome, cor: d.data.cor ?? null, updatedAt: new Date() })
    .where(and(eq(tarefaCategorias.id, id), eq(tarefaCategorias.paroquiaId, c.paroquia.id)));
  refresh();
  return {};
}

/** As tarefas da categoria não são apagadas: ficam em "Sem categoria". */
export async function excluirCategoria(id: string): Promise<TarefaResultado> {
  const c = await contexto();
  if (!c.gerir) return { erro: "Sem permissão para excluir categorias" };
  if (!z.uuid().safeParse(id).success) return { erro: "Dados inválidos" };
  await db.delete(tarefaCategorias).where(and(eq(tarefaCategorias.id, id), eq(tarefaCategorias.paroquiaId, c.paroquia.id)));
  refresh();
  return {};
}

// ---------- checklist

export async function adicionarItem(tarefaId: string, conteudo: string): Promise<TarefaResultado> {
  const c = await contexto();
  const t = texto(300).min(1, "Informe o item").safeParse(conteudo);
  if (!z.uuid().safeParse(tarefaId).success || !t.success) return { erro: t.success ? "Dados inválidos" : t.error.issues[0].message };
  const erro = await db.transaction(async (tx) => {
    const tarefa = await tarefaParaAtuar(tx, tarefaId, c);
    if (!tarefa) return NAO_ENCONTRADA.erro;
    const [{ ultima }] = await tx.select({ ultima: max(tarefaChecklistItens.ordem) }).from(tarefaChecklistItens).where(eq(tarefaChecklistItens.tarefaId, tarefa.id));
    await tx.insert(tarefaChecklistItens).values({ paroquiaId: c.paroquia.id, tarefaId: tarefa.id, conteudo: t.data, ordem: (ultima ?? -1) + 1, createdBy: c.user.id });
    await registrar(tx, c, tarefa.id, "CHECKLIST_ITEM_CRIADO");
    return null;
  });
  if (erro) return { erro };
  refresh();
  return {};
}

/** Carrega o item e a tarefa dele, já conferindo a paróquia e a permissão. */
async function itemParaAtuar(exec: Exec, itemId: string, c: Contexto) {
  const [item] = await exec
    .select()
    .from(tarefaChecklistItens)
    .where(and(eq(tarefaChecklistItens.id, itemId), eq(tarefaChecklistItens.paroquiaId, c.paroquia.id)));
  if (!item) return null;
  const tarefa = await tarefaParaAtuar(exec, item.tarefaId, c);
  return tarefa ? item : null;
}

export async function alternarItem(itemId: string, concluido: boolean): Promise<TarefaResultado> {
  const c = await contexto();
  if (!z.uuid().safeParse(itemId).success) return { erro: "Dados inválidos" };
  const erro = await db.transaction(async (tx) => {
    const item = await itemParaAtuar(tx, itemId, c);
    if (!item) return "Item não encontrado";
    await tx.update(tarefaChecklistItens).set({ concluido, updatedAt: new Date() }).where(eq(tarefaChecklistItens.id, item.id));
    await registrar(tx, c, item.tarefaId, concluido ? "CHECKLIST_ITEM_CONCLUIDO" : "CHECKLIST_ITEM_REABERTO");
    return null;
  });
  if (erro) return { erro };
  refresh();
  return {};
}

export async function editarItem(itemId: string, conteudo: string): Promise<TarefaResultado> {
  const c = await contexto();
  const t = texto(300).min(1, "Informe o item").safeParse(conteudo);
  if (!z.uuid().safeParse(itemId).success || !t.success) return { erro: t.success ? "Dados inválidos" : t.error.issues[0].message };
  const item = await itemParaAtuar(db, itemId, c);
  if (!item) return { erro: "Item não encontrado" };
  await db.update(tarefaChecklistItens).set({ conteudo: t.data, updatedAt: new Date() }).where(eq(tarefaChecklistItens.id, item.id));
  refresh();
  return {};
}

export async function removerItem(itemId: string): Promise<TarefaResultado> {
  const c = await contexto();
  if (!z.uuid().safeParse(itemId).success) return { erro: "Dados inválidos" };
  const erro = await db.transaction(async (tx) => {
    const item = await itemParaAtuar(tx, itemId, c);
    if (!item) return "Item não encontrado";
    await tx.delete(tarefaChecklistItens).where(eq(tarefaChecklistItens.id, item.id));
    await registrar(tx, c, item.tarefaId, "CHECKLIST_ITEM_REMOVIDO");
    return null;
  });
  if (erro) return { erro };
  refresh();
  return {};
}

// ---------- comentários e histórico

export async function comentar(tarefaId: string, conteudo: string): Promise<TarefaResultado> {
  const c = await contexto();
  const t = texto(2000).min(1, "Escreva o comentário").safeParse(conteudo);
  if (!z.uuid().safeParse(tarefaId).success || !t.success) return { erro: t.success ? "Dados inválidos" : t.error.issues[0].message };
  const erro = await db.transaction(async (tx) => {
    const tarefa = await tarefaParaAtuar(tx, tarefaId, c);
    if (!tarefa) return NAO_ENCONTRADA.erro;
    await tx.insert(tarefaComentarios).values({ paroquiaId: c.paroquia.id, tarefaId: tarefa.id, texto: t.data, createdBy: c.user.id });
    await registrar(tx, c, tarefa.id, "COMENTARIO_ADICIONADO");
    return null;
  });
  if (erro) return { erro };
  return {};
}

export type DetalhesTarefa = {
  comentarios: { id: string; texto: string; autor: string; em: string }[];
  atividades: { id: string; tipo: string; dados: Record<string, unknown> | null; autor: string; em: string }[];
};

/** Leitura sob demanda, para o painel de detalhes (comentários e histórico não vão na carga da página). */
export async function detalhesDaTarefa(tarefaId: string): Promise<DetalhesTarefa | { erro: string }> {
  const c = await contexto();
  if (!z.uuid().safeParse(tarefaId).success) return { erro: "Dados inválidos" };
  const t = await tarefaParaAtuar(db, tarefaId, c);
  if (!t) return NAO_ENCONTRADA;
  const [comentarios, atividades] = await Promise.all([
    db
      .select({ id: tarefaComentarios.id, texto: tarefaComentarios.texto, autor: usuarios.name, em: tarefaComentarios.createdAt })
      .from(tarefaComentarios)
      .leftJoin(usuarios, eq(usuarios.id, tarefaComentarios.createdBy))
      .where(eq(tarefaComentarios.tarefaId, t.id))
      .orderBy(asc(tarefaComentarios.createdAt)),
    db
      .select({ id: tarefaAtividades.id, tipo: tarefaAtividades.tipo, dados: tarefaAtividades.dados, autor: usuarios.name, em: tarefaAtividades.createdAt })
      .from(tarefaAtividades)
      .leftJoin(usuarios, eq(usuarios.id, tarefaAtividades.createdBy))
      .where(eq(tarefaAtividades.tarefaId, t.id))
      .orderBy(desc(tarefaAtividades.createdAt))
      .limit(100),
  ]);
  return {
    comentarios: comentarios.map((r) => ({ ...r, autor: r.autor ?? "—", em: r.em.toISOString() })),
    atividades: atividades.map((r) => ({ ...r, autor: r.autor ?? "—", em: r.em.toISOString() })),
  };
}
