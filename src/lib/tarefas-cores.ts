/** Paleta inspirada no Trello — IDs persistidos no backend (campo `cor`). */
export const KANBAN_CATEGORY_COLOR_IDS = [
  "slate",
  "blue",
  "sky",
  "teal",
  "green",
  "lime",
  "amber",
  "orange",
  "red",
  "rose",
  "pink",
  "fuchsia",
  "violet",
  "indigo",
] as const;

export type KanbanCategoryColorId = (typeof KANBAN_CATEGORY_COLOR_IDS)[number];

export type KanbanCategoryColorStyle = {
  label: string;
  headerBg: string;
  headerBorder: string;
  accentBar: string;
  dot: string;
  ring: string;
};

export const KANBAN_CATEGORY_COLORS: Record<KanbanCategoryColorId, KanbanCategoryColorStyle> = {
  slate: {
    label: "Cinza",
    headerBg: "bg-slate-500/12",
    headerBorder: "border-slate-500/35",
    accentBar: "bg-slate-500",
    dot: "bg-slate-500",
    ring: "ring-slate-500/50",
  },
  blue: {
    label: "Azul",
    headerBg: "bg-blue-500/12",
    headerBorder: "border-blue-500/35",
    accentBar: "bg-blue-500",
    dot: "bg-blue-500",
    ring: "ring-blue-500/50",
  },
  sky: {
    label: "Céu",
    headerBg: "bg-sky-500/12",
    headerBorder: "border-sky-500/35",
    accentBar: "bg-sky-500",
    dot: "bg-sky-500",
    ring: "ring-sky-500/50",
  },
  teal: {
    label: "Teal",
    headerBg: "bg-teal-500/12",
    headerBorder: "border-teal-500/35",
    accentBar: "bg-teal-500",
    dot: "bg-teal-500",
    ring: "ring-teal-500/50",
  },
  green: {
    label: "Verde",
    headerBg: "bg-emerald-500/12",
    headerBorder: "border-emerald-500/35",
    accentBar: "bg-emerald-500",
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/50",
  },
  lime: {
    label: "Lima",
    headerBg: "bg-lime-500/12",
    headerBorder: "border-lime-500/35",
    accentBar: "bg-lime-500",
    dot: "bg-lime-500",
    ring: "ring-lime-500/50",
  },
  amber: {
    label: "Âmbar",
    headerBg: "bg-amber-500/12",
    headerBorder: "border-amber-500/35",
    accentBar: "bg-amber-500",
    dot: "bg-amber-500",
    ring: "ring-amber-500/50",
  },
  orange: {
    label: "Laranja",
    headerBg: "bg-orange-500/12",
    headerBorder: "border-orange-500/35",
    accentBar: "bg-orange-500",
    dot: "bg-orange-500",
    ring: "ring-orange-500/50",
  },
  red: {
    label: "Vermelho",
    headerBg: "bg-red-500/12",
    headerBorder: "border-red-500/35",
    accentBar: "bg-red-500",
    dot: "bg-red-500",
    ring: "ring-red-500/50",
  },
  rose: {
    label: "Rosa",
    headerBg: "bg-rose-500/12",
    headerBorder: "border-rose-500/35",
    accentBar: "bg-rose-500",
    dot: "bg-rose-500",
    ring: "ring-rose-500/50",
  },
  pink: {
    label: "Pink",
    headerBg: "bg-pink-500/12",
    headerBorder: "border-pink-500/35",
    accentBar: "bg-pink-500",
    dot: "bg-pink-500",
    ring: "ring-pink-500/50",
  },
  fuchsia: {
    label: "Fúcsia",
    headerBg: "bg-fuchsia-500/12",
    headerBorder: "border-fuchsia-500/35",
    accentBar: "bg-fuchsia-500",
    dot: "bg-fuchsia-500",
    ring: "ring-fuchsia-500/50",
  },
  violet: {
    label: "Violeta",
    headerBg: "bg-violet-500/12",
    headerBorder: "border-violet-500/35",
    accentBar: "bg-violet-500",
    dot: "bg-violet-500",
    ring: "ring-violet-500/50",
  },
  indigo: {
    label: "Índigo",
    headerBg: "bg-indigo-500/12",
    headerBorder: "border-indigo-500/35",
    accentBar: "bg-indigo-500",
    dot: "bg-indigo-500",
    ring: "ring-indigo-500/50",
  },
};

const DEFAULT_COLOR: KanbanCategoryColorId = "slate";

export function resolveKanbanCategoryColor(cor?: string | null): KanbanCategoryColorStyle {
  if (cor && cor in KANBAN_CATEGORY_COLORS) {
    return KANBAN_CATEGORY_COLORS[cor as KanbanCategoryColorId];
  }
  return KANBAN_CATEGORY_COLORS[DEFAULT_COLOR];
}

/** Cor sugerida ao criar categoria (rotação pela ordem). */
export function suggestKanbanCategoryColor(ordem: number): KanbanCategoryColorId {
  return KANBAN_CATEGORY_COLOR_IDS[ordem % KANBAN_CATEGORY_COLOR_IDS.length];
}
