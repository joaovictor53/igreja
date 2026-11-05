// RBAC. O catálogo de permissões é fixo (vive no código); quais permissões cada papel
// tem é configurável por paróquia (tabela "papeis"). Aqui ficam só os padrões e os
// rótulos, sem dependências de servidor, para a tela de papéis e o sidebar usarem.

export const PAPEIS = ["admin", "paroco", "secretaria", "coordenador", "catequista", "membro"] as const;
export type PapelPadrao = (typeof PAPEIS)[number];

export const NOMES_PAPEL: Record<PapelPadrao, string> = {
  admin: "Administrador",
  paroco: "Pároco",
  secretaria: "Secretaria",
  coordenador: "Coordenador",
  catequista: "Catequista",
  membro: "Membro",
};

const SECRETARIA: PapelPadrao[] = ["admin", "paroco", "secretaria"];
const GESTAO: PapelPadrao[] = ["admin", "paroco"];

/** Permissão → papéis que a têm por padrão, enquanto a paróquia não personalizar o papel. */
export const PERMISSOES = {
  "liturgia:gerir": SECRETARIA,
  "agenda:gerir": SECRETARIA,
  "escalas:gerir": SECRETARIA,
  "inscricoes:gerir": SECRETARIA,
  "pedidos:gerir": SECRETARIA,
  "pedidos:receber": GESTAO,
  "sacramentos:gerir": SECRETARIA,
  "catequese:ver": [...SECRETARIA, "catequista"],
  "catequese:gerir": SECRETARIA,
  "tarefas:ver": SECRETARIA, // vê e atualiza as tarefas em que é responsável ou que criou
  "tarefas:gerir": SECRETARIA,
  "reservas:gerir": SECRETARIA,
  "ferramentas:usar": SECRETARIA,
  "registros:gerir": SECRETARIA,
  "pessoas:gerir": SECRETARIA,
  "comunidades:gerir": SECRETARIA,
  "convites:gerir": SECRETARIA,
  "alertas:receber": SECRETARIA,
  "auditoria:ver": GESTAO,
  // Só o administrador: quem edita papéis poderia dar a si mesmo qualquer acesso.
  "papeis:gerir": ["admin"],
} satisfies Record<string, PapelPadrao[]>;

export type Permissao = keyof typeof PERMISSOES;

export const TODAS_PERMISSOES = Object.keys(PERMISSOES) as Permissao[];

/** O que a tela deixa marcar: tudo, menos a administração de papéis. */
export const PERMISSOES_ATRIBUIVEIS = TODAS_PERMISSOES.filter((p) => p !== "papeis:gerir");

export const ROTULOS_PERMISSAO: Record<Permissao, { grupo: string; rotulo: string }> = {
  "liturgia:gerir": { grupo: "Liturgia", rotulo: "Gerenciar horários, celebrações e intenções" },
  "agenda:gerir": { grupo: "Agenda", rotulo: "Gerenciar a agenda pública" },
  "escalas:gerir": { grupo: "Escalas", rotulo: "Montar escalas e funções" },
  "inscricoes:gerir": { grupo: "Pastoral", rotulo: "Gerenciar inscrições e exportar respostas" },
  "pedidos:gerir": { grupo: "Pastoral", rotulo: "Atender pedidos pastorais" },
  "pedidos:receber": { grupo: "Pastoral", rotulo: "Receber aviso de novo pedido e ser responsável por ele" },
  "sacramentos:gerir": { grupo: "Pastoral", rotulo: "Gerenciar batizados e casamentos" },
  "catequese:ver": { grupo: "Catequese", rotulo: "Ver turmas e registrar presenças" },
  "catequese:gerir": { grupo: "Catequese", rotulo: "Criar turmas e gerenciar matrículas" },
  "tarefas:ver": { grupo: "Secretaria", rotulo: "Ver e atualizar as próprias tarefas" },
  "tarefas:gerir": { grupo: "Secretaria", rotulo: "Gerenciar todas as tarefas, categorias e responsáveis" },
  "reservas:gerir": { grupo: "Secretaria", rotulo: "Gerenciar reservas de espaços" },
  "ferramentas:usar": { grupo: "Secretaria", rotulo: "Usar as ferramentas de QR Code" },
  "alertas:receber": { grupo: "Secretaria", rotulo: "Receber avisos da secretaria" },
  "registros:gerir": { grupo: "Registros", rotulo: "Gerenciar livros, assentos e certidões" },
  "pessoas:gerir": { grupo: "Cadastros", rotulo: "Gerenciar pessoas e convites" },
  "comunidades:gerir": { grupo: "Cadastros", rotulo: "Gerenciar comunidades" },
  "convites:gerir": { grupo: "Cadastros", rotulo: "Gerar convites de acesso" },
  "auditoria:ver": { grupo: "Administração", rotulo: "Ver o registro de auditoria" },
  "papeis:gerir": { grupo: "Administração", rotulo: "Gerenciar papéis e acessos" },
};

export function ehPapelPadrao(papel: string): papel is PapelPadrao {
  return (PAPEIS as readonly string[]).includes(papel);
}

/** Administrador tem tudo, sempre; os demais papéis de sistema têm o padrão acima. */
export function permissoesPadrao(papel: string): Permissao[] {
  if (papel === "admin") return [...TODAS_PERMISSOES];
  if (!ehPapelPadrao(papel)) return [];
  return TODAS_PERMISSOES.filter((p) => (PERMISSOES[p] as readonly string[]).includes(papel));
}

/** Descarta o que não é permissão conhecida e o que não pode ser atribuído a um papel editável. */
export function permissoesValidas(lista: unknown): Permissao[] {
  if (!Array.isArray(lista)) return [];
  return PERMISSOES_ATRIBUIVEIS.filter((p) => lista.includes(p));
}

/** Permissões que vêm de brinde com outra: quem gerencia as tarefas também as vê. */
const IMPLICA: Partial<Record<Permissao, Permissao[]>> = { "tarefas:gerir": ["tarefas:ver"] };

export function comImplicitas(lista: Iterable<Permissao>): Set<Permissao> {
  const r = new Set(lista);
  for (const p of [...r]) for (const i of IMPLICA[p] ?? []) r.add(i);
  return r;
}
