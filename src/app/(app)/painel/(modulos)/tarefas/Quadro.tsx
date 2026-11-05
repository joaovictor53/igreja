"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CheckSquareIcon, EyeOffIcon, EyeIcon, PencilIcon, PlusIcon, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { tarefaAtrasada } from "@/lib/secretaria";
import { compararTarefas, progressoChecklist, type TarefaView } from "@/lib/tarefas";
import { KANBAN_CATEGORY_COLORS, KANBAN_CATEGORY_COLOR_IDS, resolveKanbanCategoryColor } from "@/lib/tarefas-cores";
import { atualizarCategoria, excluirCategoria } from "@/server/modules/tarefas/actions";
import { useKanbanColumnPrefs } from "./useKanbanColumnPrefs";
import { BarraProgresso, PrioridadeBadge, formatarPrazo } from "./ui";

export type Coluna = {
  id: string;
  titulo: string;
  cor?: string | null;
  /** Coluna que é uma categoria: pode ser renomeada, recolorida e excluída por quem gerencia. */
  categoriaId?: string;
};

export function CartaoTarefa({ t, hoje, onAbrir }: { t: TarefaView; hoje: string; onAbrir: (t: TarefaView) => void }) {
  const atrasada = tarefaAtrasada(t.prazo, t.status === "DONE", hoje);
  const feitos = t.checklist.filter((i) => i.concluido).length;
  return (
    <button
      type="button"
      onClick={() => onAbrir(t)}
      className="flex w-full flex-col gap-2 rounded-lg border bg-card p-3 text-left text-card-foreground shadow-xs hover:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className={cn("font-medium break-words", t.status === "DONE" && "text-muted-foreground line-through")}>{t.titulo}</span>
      <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <PrioridadeBadge prioridade={t.prioridade} />
        <span className={cn(atrasada && "font-medium text-destructive")}>{atrasada ? "Atrasada · " : ""}{formatarPrazo(t.prazo)}</span>
      </span>
      {t.checklist.length > 0 && (
        <span className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><CheckSquareIcon className="size-3" />{feitos}/{t.checklist.length}</span>
          <BarraProgresso percentual={progressoChecklist(t.checklist)} />
        </span>
      )}
      {t.responsaveis.length > 0 && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <UserIcon className="size-3 shrink-0" />
          <span className="truncate">
            {t.responsaveis.slice(0, 2).map((r) => r.nome).join(", ")}
            {t.responsaveis.length > 2 && ` +${t.responsaveis.length - 2}`}
          </span>
        </span>
      )}
    </button>
  );
}

function CartaoArrastavel({ t, hoje, onAbrir, arrastavel }: { t: TarefaView; hoje: string; onAbrir: (t: TarefaView) => void; arrastavel: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: t.id, disabled: !arrastavel });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={cn("touch-manipulation", isDragging && "opacity-40")}>
      <CartaoTarefa t={t} hoje={hoje} onAbrir={onAbrir} />
    </div>
  );
}

function EditorCategoria({ coluna, onFechar, onErro }: { coluna: Coluna; onFechar: () => void; onErro: (m: string) => void }) {
  const [nome, setNome] = useState(coluna.titulo);
  const [cor, setCor] = useState(coluna.cor ?? "slate");
  const [ocupado, setOcupado] = useState(false);
  const id = coluna.categoriaId!;

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true);
    const r = await atualizarCategoria(id, { nome, cor: cor as (typeof KANBAN_CATEGORY_COLOR_IDS)[number] });
    setOcupado(false);
    if (r.erro) onErro(r.erro);
    else onFechar();
  }
  async function excluir() {
    if (!window.confirm(`Excluir a categoria "${coluna.titulo}"? As tarefas dela ficam em "Sem categoria".`)) return;
    setOcupado(true);
    const r = await excluirCategoria(id);
    setOcupado(false);
    if (r.erro) onErro(r.erro);
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-2 rounded-lg border bg-background p-2">
      <Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} required aria-label="Nome da categoria" />
      <NativeSelect value={cor} onChange={(e) => setCor(e.target.value)} aria-label="Cor" className="w-full">
        {KANBAN_CATEGORY_COLOR_IDS.map((c) => <NativeSelectOption key={c} value={c}>{KANBAN_CATEGORY_COLORS[c].label}</NativeSelectOption>)}
      </NativeSelect>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={ocupado}>Salvar</Button>
        <Button type="button" variant="outline" size="sm" onClick={onFechar}>Cancelar</Button>
        <Button type="button" variant="destructive" size="sm" disabled={ocupado} onClick={excluir}>Excluir</Button>
      </div>
    </form>
  );
}

function ColunaQuadro({
  coluna,
  tarefas,
  hoje,
  arrastavel,
  podeEditarColuna,
  podeCriar,
  esconderConcluidas,
  onAlternarConcluidas,
  onAbrir,
  onNova,
  onErro,
}: {
  coluna: Coluna;
  tarefas: TarefaView[];
  hoje: string;
  arrastavel: boolean;
  podeEditarColuna: boolean;
  podeCriar: boolean;
  esconderConcluidas: boolean;
  onAlternarConcluidas: () => void;
  onAbrir: (t: TarefaView) => void;
  onNova: () => void;
  onErro: (m: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna.id });
  const [editando, setEditando] = useState(false);
  const estilo = resolveKanbanCategoryColor(coluna.cor);
  const feitas = tarefas.filter((t) => t.status === "DONE").length;
  const visiveis = (esconderConcluidas ? tarefas.filter((t) => t.status !== "DONE") : tarefas).slice().sort(compararTarefas);

  return (
    <section
      ref={setNodeRef}
      aria-label={coluna.titulo}
      className={cn(
        "flex w-[85vw] shrink-0 snap-start flex-col gap-2 rounded-xl border bg-muted/40 p-2 sm:w-72",
        isOver && cn("ring-2", estilo.ring),
      )}
    >
      <header className={cn("flex items-center gap-2 rounded-lg border px-2 py-1.5", estilo.headerBg, estilo.headerBorder)}>
        <span className={cn("size-2.5 shrink-0 rounded-full", estilo.dot)} aria-hidden />
        <h3 className="min-w-0 flex-1 truncate font-medium">{coluna.titulo}</h3>
        <span className="text-xs text-muted-foreground">{tarefas.length}</span>
        {feitas > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onAlternarConcluidas}
            aria-label={esconderConcluidas ? `Mostrar ${feitas} concluída(s)` : `Ocultar ${feitas} concluída(s)`}
            title={esconderConcluidas ? "Mostrar concluídas" : "Ocultar concluídas"}
          >
            {esconderConcluidas ? <EyeIcon /> : <EyeOffIcon />}
          </Button>
        )}
        {podeEditarColuna && (
          <Button type="button" variant="ghost" size="icon-xs" onClick={() => setEditando((v) => !v)} aria-label={`Editar categoria ${coluna.titulo}`}>
            <PencilIcon />
          </Button>
        )}
        {podeCriar && (
          <Button type="button" variant="ghost" size="icon-xs" onClick={onNova} aria-label={`Nova tarefa em ${coluna.titulo}`}>
            <PlusIcon />
          </Button>
        )}
      </header>
      {editando && podeEditarColuna && <EditorCategoria coluna={coluna} onFechar={() => setEditando(false)} onErro={onErro} />}
      <div className="flex min-h-16 flex-col gap-2">
        {visiveis.map((t) => <CartaoArrastavel key={t.id} t={t} hoje={hoje} onAbrir={onAbrir} arrastavel={arrastavel} />)}
        {!visiveis.length && <p className="px-1 py-3 text-center text-xs text-muted-foreground">Nenhuma tarefa</p>}
      </div>
    </section>
  );
}

export function Quadro({
  colunas,
  tarefasPorColuna,
  hoje,
  usuarioId,
  arrastavel,
  podeEditarColunas,
  podeCriar,
  onMover,
  onAbrir,
  onNova,
  onErro,
}: {
  colunas: Coluna[];
  tarefasPorColuna: Record<string, TarefaView[]>;
  hoje: string;
  usuarioId: string;
  arrastavel: boolean;
  podeEditarColunas: boolean;
  podeCriar: boolean;
  onMover: (tarefaId: string, colunaId: string) => void;
  onAbrir: (t: TarefaView) => void;
  onNova: (colunaId: string) => void;
  onErro: (m: string) => void;
}) {
  const { isHideDone, toggleHideDone } = useKanbanColumnPrefs(usuarioId);
  const [arrastando, setArrastando] = useState<TarefaView | null>(null);
  // Mouse precisa mover alguns pixels; toque precisa de um segundo de pausa, para não brigar com a rolagem lateral.
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );
  const todas = Object.values(tarefasPorColuna).flat();

  function aoIniciar(e: DragStartEvent) {
    setArrastando(todas.find((t) => t.id === e.active.id) ?? null);
  }
  function aoSoltar(e: DragEndEvent) {
    setArrastando(null);
    if (e.over) onMover(String(e.active.id), String(e.over.id));
  }

  return (
    <DndContext id="quadro-tarefas" sensors={sensores} onDragStart={aoIniciar} onDragEnd={aoSoltar} onDragCancel={() => setArrastando(null)}>
      <div className="-mx-4 flex snap-x snap-mandatory items-start gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
        {colunas.map((c) => (
          <ColunaQuadro
            key={c.id}
            coluna={c}
            tarefas={tarefasPorColuna[c.id] ?? []}
            hoje={hoje}
            arrastavel={arrastavel}
            podeEditarColuna={podeEditarColunas && !!c.categoriaId}
            podeCriar={podeCriar}
            esconderConcluidas={isHideDone(c.id)}
            onAlternarConcluidas={() => toggleHideDone(c.id)}
            onAbrir={onAbrir}
            onNova={() => onNova(c.id)}
            onErro={onErro}
          />
        ))}
      </div>
      <DragOverlay>{arrastando ? <div className="rotate-1 opacity-90"><CartaoTarefa t={arrastando} hoje={hoje} onAbrir={() => {}} /></div> : null}</DragOverlay>
    </DndContext>
  );
}
