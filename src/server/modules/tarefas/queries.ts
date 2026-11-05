import "server-only";
import { and, asc, eq, exists, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import {
  pessoas,
  tarefaCategorias,
  tarefaChecklistItens,
  tarefaResponsaveis,
  tarefas,
  user as usuarios,
} from "@/db/schema";
import type { CategoriaView, TarefaView } from "@/lib/tarefas";

type Quem = { paroquiaId: string; userId: string; pessoaId: string | null; gerir: boolean };

/**
 * Quem gerencia recebe todas as tarefas da paróquia; os demais, só as que criaram
 * ou em que são responsáveis. A regra mora aqui para a página não precisar repeti-la.
 */
export async function carregarTarefas(q: Quem): Promise<{
  tarefas: TarefaView[];
  categorias: CategoriaView[];
  pessoas: { id: string; nome: string }[];
}> {
  const minhas = q.pessoaId
    ? or(
        eq(tarefas.createdBy, q.userId),
        exists(
          db
            .select({ x: tarefaResponsaveis.tarefaId })
            .from(tarefaResponsaveis)
            .where(and(eq(tarefaResponsaveis.tarefaId, tarefas.id), eq(tarefaResponsaveis.pessoaId, q.pessoaId))),
        ),
      )
    : eq(tarefas.createdBy, q.userId);

  const [linhas, categorias, lista] = await Promise.all([
    db
      .select({ t: tarefas, criador: usuarios.name })
      .from(tarefas)
      .leftJoin(usuarios, eq(usuarios.id, tarefas.createdBy))
      .where(and(eq(tarefas.paroquiaId, q.paroquiaId), q.gerir ? undefined : minhas))
      .orderBy(asc(tarefas.prazo), asc(tarefas.createdAt)),
    db
      .select({ id: tarefaCategorias.id, nome: tarefaCategorias.nome, cor: tarefaCategorias.cor, ordem: tarefaCategorias.ordem })
      .from(tarefaCategorias)
      .where(eq(tarefaCategorias.paroquiaId, q.paroquiaId))
      .orderBy(asc(tarefaCategorias.ordem), asc(tarefaCategorias.createdAt)),
    // quem não gerencia só atribui a si mesmo
    q.gerir
      ? db.select({ id: pessoas.id, nome: pessoas.nome }).from(pessoas).where(eq(pessoas.paroquiaId, q.paroquiaId)).orderBy(asc(pessoas.nome))
      : q.pessoaId
        ? db.select({ id: pessoas.id, nome: pessoas.nome }).from(pessoas).where(and(eq(pessoas.id, q.pessoaId), eq(pessoas.paroquiaId, q.paroquiaId)))
        : Promise.resolve([]),
  ]);

  const ids = linhas.map((l) => l.t.id);
  const [responsaveis, itens] = ids.length
    ? await Promise.all([
        db
          .select({ tarefaId: tarefaResponsaveis.tarefaId, id: pessoas.id, nome: pessoas.nome })
          .from(tarefaResponsaveis)
          .innerJoin(pessoas, eq(pessoas.id, tarefaResponsaveis.pessoaId))
          .where(inArray(tarefaResponsaveis.tarefaId, ids))
          .orderBy(asc(pessoas.nome)),
        db
          .select({ tarefaId: tarefaChecklistItens.tarefaId, id: tarefaChecklistItens.id, conteudo: tarefaChecklistItens.conteudo, concluido: tarefaChecklistItens.concluido })
          .from(tarefaChecklistItens)
          .where(inArray(tarefaChecklistItens.tarefaId, ids))
          .orderBy(asc(tarefaChecklistItens.ordem), asc(tarefaChecklistItens.createdAt)),
      ])
    : [[], []];

  const porTarefa = <T extends { tarefaId: string }>(rows: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of rows) m.set(r.tarefaId, [...(m.get(r.tarefaId) ?? []), r]);
    return m;
  };
  const resp = porTarefa(responsaveis);
  const chk = porTarefa(itens);

  return {
    categorias,
    pessoas: lista,
    tarefas: linhas.map(({ t, criador }) => ({
      id: t.id,
      titulo: t.titulo,
      descricao: t.descricao,
      observacao: t.observacao,
      status: t.status,
      prioridade: t.prioridade,
      prazo: t.prazo,
      categoriaId: t.categoriaId,
      criadoPor: criador ?? "—",
      criadoPorMim: t.createdBy === q.userId,
      responsaveis: (resp.get(t.id) ?? []).map(({ id, nome }) => ({ id, nome })),
      checklist: (chk.get(t.id) ?? []).map(({ id, conteudo, concluido }) => ({ id, conteudo, concluido })),
    })),
  };
}
