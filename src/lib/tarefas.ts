// Sem dependências de servidor: usado pelo schema, pelas actions, pelas telas e pelos testes.

export const TAREFA_STATUS = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"] as const;
export type TarefaStatus = (typeof TAREFA_STATUS)[number];

export const ROTULO_STATUS: Record<TarefaStatus, string> = {
  TODO: "A fazer",
  IN_PROGRESS: "Em andamento",
  BLOCKED: "Bloqueada",
  DONE: "Concluída",
};

export const TAREFA_PRIORIDADES = ["BAIXA", "MEDIA", "ALTA", "URGENTE"] as const;
export type TarefaPrioridade = (typeof TAREFA_PRIORIDADES)[number];

export const ROTULO_PRIORIDADE: Record<TarefaPrioridade, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
  URGENTE: "Urgente",
};

export const TIPOS_ATIVIDADE = [
  "TAREFA_CRIADA",
  "STATUS_ATUALIZADO",
  "CATEGORIA_MOVIDA",
  "RESPONSAVEIS_ALTERADOS",
  "OBSERVACAO_ATUALIZADA",
  "COMENTARIO_ADICIONADO",
  "CHECKLIST_ITEM_CRIADO",
  "CHECKLIST_ITEM_CONCLUIDO",
  "CHECKLIST_ITEM_REABERTO",
  "CHECKLIST_ITEM_REMOVIDO",
] as const;
export type TipoAtividade = (typeof TIPOS_ATIVIDADE)[number];

export function rotuloAtividade(tipo: string, dados: Record<string, unknown> | null): string {
  const rotulo = (s: unknown) => (typeof s === "string" && s in ROTULO_STATUS ? ROTULO_STATUS[s as TarefaStatus] : "—");
  switch (tipo) {
    case "TAREFA_CRIADA": return "Tarefa criada";
    case "STATUS_ATUALIZADO": return `Status: ${rotulo(dados?.de)} → ${rotulo(dados?.para)}`;
    case "CATEGORIA_MOVIDA": return `Categoria: ${dados?.de ?? "Sem categoria"} → ${dados?.para ?? "Sem categoria"}`;
    case "RESPONSAVEIS_ALTERADOS": return "Responsáveis alterados";
    case "OBSERVACAO_ATUALIZADA": return "Observação atualizada";
    case "COMENTARIO_ADICIONADO": return "Comentário adicionado";
    case "CHECKLIST_ITEM_CRIADO": return "Checklist: item criado";
    case "CHECKLIST_ITEM_CONCLUIDO": return "Checklist: item concluído";
    case "CHECKLIST_ITEM_REABERTO": return "Checklist: item reaberto";
    case "CHECKLIST_ITEM_REMOVIDO": return "Checklist: item removido";
    default: return tipo;
  }
}

/** Percentual de itens feitos (0 sem checklist). */
export function progressoChecklist(itens: { concluido: boolean }[]): number {
  if (!itens.length) return 0;
  return Math.round((itens.filter((i) => i.concluido).length / itens.length) * 100);
}

const PESO_PRIORIDADE: Record<TarefaPrioridade, number> = { URGENTE: 0, ALTA: 1, MEDIA: 2, BAIXA: 3 };

/** Ordem dentro de uma coluna: mais urgente primeiro, depois prazo mais próximo (sem prazo por último). */
export function compararTarefas(
  a: { prioridade: TarefaPrioridade; prazo: string | null },
  b: { prioridade: TarefaPrioridade; prazo: string | null },
): number {
  const p = PESO_PRIORIDADE[a.prioridade] - PESO_PRIORIDADE[b.prioridade];
  if (p) return p;
  if (a.prazo === b.prazo) return 0;
  if (!a.prazo) return 1;
  if (!b.prazo) return -1;
  return a.prazo < b.prazo ? -1 : 1;
}

// Formas serializáveis que a página (servidor) entrega ao quadro (cliente).
export type CategoriaView = { id: string; nome: string; cor: string | null; ordem: number };
export type TarefaView = {
  id: string;
  titulo: string;
  descricao: string | null;
  observacao: string | null;
  status: TarefaStatus;
  prioridade: TarefaPrioridade;
  prazo: string | null;
  categoriaId: string | null;
  criadoPor: string;
  criadoPorMim: boolean;
  responsaveis: { id: string; nome: string }[];
  checklist: { id: string; conteudo: string; concluido: boolean }[];
};
