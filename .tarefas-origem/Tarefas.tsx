import { useEffect, useMemo, useRef, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation, useNavigate, Link, useSearchParams } from "react-router-dom";
import {
  Plus,
  RefreshCw,
  MessageSquare,
  Paperclip,
  ListChecks,
  Trash2,
  Upload,
  User as UserIcon,
  Calendar as CalendarIcon,
  LayoutGrid,
  Columns3,
  History,
  CheckCircle2,
  Circle,
  Ban,
  ArrowRight,
  FileUp,
  FileX2,
  MessageCircle,
  Pencil,
  ChevronsUpDown,
  Check,
  BarChart3,
  Eye,
  EyeOff,
  RotateCcw,
  PlayCircle,
} from "lucide-react";
import {
  DndContext,
  useDroppable,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { AppPage } from "@/components/AppPage";
import {
  KanbanBoardScroller,
  KANBAN_COLUMN_WIDTH_CLASS,
} from "@/pages/tarefas/_components/kanban-board-scroller";
import {
  KANBAN_CATEGORY_COLOR_IDS,
  KANBAN_CATEGORY_COLORS,
  resolveKanbanCategoryColor,
  suggestKanbanCategoryColor,
  type KanbanCategoryColorId,
} from "@/pages/tarefas/kanbanCategoryColors";
import { useKanbanColumnPrefs } from "@/pages/tarefas/useKanbanColumnPrefs";
import { cn } from "@/lib/utils";
import { apiAssetUrl } from "@/config/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useDepartamentos } from "@/hooks/use-departamentos";
import {
  useAtribuirTarefa,
  useAnexosTarefa,
  useCategoriasTarefasDepartamento,
  useCreateCategoriaTarefasDepartamento,
  useUpdateCategoriaTarefas,
  useChecklistTarefa,
  useCreateChecklistItemTarefa,
  useComentariosTarefa,
  useAtividadesTarefa,
  useCreateComentarioTarefa,
  useCreateTarefaDepartamento,
  useDeleteAnexoTarefa,
  useDeleteChecklistItemTarefa,
  useMinhasTarefas,
  useTarefasDepartamento,
  useUpdateChecklistItemTarefa,
  useUpdateTarefa,
  useUploadAnexoTarefa,
  useUsuariosTarefas,
} from "@/hooks/use-tarefas";
import type {
  Tarefa,
  TarefaAnexo,
  TarefaCategoria,
  TarefaChecklistItem,
  TarefaAtividade,
  TarefaPrioridade,
  TarefaStatus,
} from "@/lib/api";
import type { TarefaUsuarioOpcao } from "@/lib/api";
import type { Departamento } from "@/lib/api";

const statusLabel: Record<TarefaStatus, string> = {
  TODO: "A fazer",
  IN_PROGRESS: "Em andamento",
  BLOCKED: "Bloqueada",
  DONE: "Concluída",
};

/** Histórico pode trazer `TODO` ou `TarefaStatusEnum.TODO` (dados antigos). */
function labelTarefaStatusHistorico(raw: unknown): string {
  if (raw == null) return "—";
  const s0 = String(raw).trim();
  if (!s0) return "—";
  const code = s0.replace(/^TarefaStatusEnum\./i, "").toUpperCase();
  if (code in statusLabel) return statusLabel[code as TarefaStatus];
  return code;
}

const priorityLabel: Record<TarefaPrioridade, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
  URGENTE: "Urgente",
};

function StatusBadge({ status }: { status: TarefaStatus }) {
  const variant =
    status === "DONE"
      ? "default"
      : status === "BLOCKED"
        ? "destructive"
        : "secondary";
  return <Badge variant={variant as any}>{statusLabel[status]}</Badge>;
}

function statusBarClass(status: TarefaStatus) {
  if (status === "DONE") return "bg-emerald-500";
  if (status === "IN_PROGRESS") return "bg-amber-400";
  if (status === "BLOCKED") return "bg-rose-500";
  return "bg-slate-400";
}

function progressColorClass(percent: number) {
  if (percent >= 100) return "bg-emerald-500";
  if (percent >= 60) return "bg-sky-500";
  if (percent >= 30) return "bg-amber-400";
  return "bg-rose-500";
}

/** API envia prazo como YYYY-MM-DD (date-only). `new Date(iso)` usa UTC e desloca o dia no fuso BR. */
function parseDateOnlyLocal(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso).trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  return new Date(y, mo, d);
}

function startOfDayLocal(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Aberta (não DONE) com prazo anterior ao dia atual (fuso local). */
function taskIsOpenOverdue(t: Tarefa): boolean {
  if (t.status === "DONE") return false;
  const due = t.due_date ? parseDateOnlyLocal(t.due_date) : null;
  if (!due) return false;
  const now = new Date();
  return startOfDayLocal(due) < startOfDayLocal(now);
}

function taskHasResponsavel(t: Tarefa, usuarioId: number): boolean {
  const ids = (t.assignee_user_ids ?? (t.assignee_user_id ? [t.assignee_user_id] : [])) as number[];
  return ids.includes(usuarioId);
}

function canUserUpdateTaskStatus(t: Tarefa, userId: number | undefined, canEditGlobal: boolean): boolean {
  if (!userId) return false;
  if (canEditGlobal) return true;
  if (taskHasResponsavel(t, userId)) return true;
  if (t.created_by_user_id === userId) return true;
  return false;
}

function stopCardActionPropagation(e: React.SyntheticEvent) {
  e.stopPropagation();
}

function TaskStatusQuickActions({
  status,
  onChangeStatus,
  compact = false,
}: {
  status: TarefaStatus;
  onChangeStatus: (s: TarefaStatus) => void;
  compact?: boolean;
}) {
  const actions: Array<{
    value: TarefaStatus;
    label: string;
    icon: React.ReactNode;
    className?: string;
  }> = [
    {
      value: "DONE",
      label: "Concluir",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      className: "text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400",
    },
    {
      value: "IN_PROGRESS",
      label: "Em andamento",
      icon: <PlayCircle className="h-3.5 w-3.5" />,
      className: "text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400",
    },
    {
      value: "BLOCKED",
      label: "Bloquear",
      icon: <Ban className="h-3.5 w-3.5" />,
      className: "text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400",
    },
    {
      value: "TODO",
      label: "Reabrir",
      icon: <RotateCcw className="h-3.5 w-3.5" />,
      className: "text-slate-600 hover:bg-slate-500/10 hover:text-slate-700 dark:text-slate-400",
    },
  ];

  const visible =
    status === "DONE"
      ? actions.filter((a) => a.value === "TODO")
      : actions.filter((a) => a.value !== "TODO");

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "flex flex-wrap items-center gap-1",
          compact ? "justify-end" : "justify-stretch",
        )}
        onClick={stopCardActionPropagation}
        onPointerDown={stopCardActionPropagation}
      >
        {visible.map((action) => {
          const isActive = status === action.value;
          const isPrimary = action.value === "DONE" && status !== "DONE";
          return (
            <Tooltip key={action.value}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant={isPrimary ? "default" : isActive ? "secondary" : "outline"}
                  className={cn(
                    compact ? "h-7 px-2" : "h-7 flex-1 min-w-0 px-2 text-xs",
                    !isPrimary && !isActive && action.className,
                    isPrimary && "bg-emerald-600 hover:bg-emerald-700 text-white",
                  )}
                  disabled={isActive}
                  onClick={() => onChangeStatus(action.value)}
                >
                  {action.icon}
                  {!compact ? <span className="ml-1 truncate">{action.label}</span> : null}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{action.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

function PriorityBadge({ priority }: { priority: TarefaPrioridade }) {
  const variant = priority === "URGENTE" ? "destructive" : "outline";
  return <Badge variant={variant as any}>{priorityLabel[priority]}</Badge>;
}

function SortableChecklistRow({
  item,
  onToggle,
  onDelete,
  onEdit,
  busy,
}: {
  item: TarefaChecklistItem;
  onToggle: (item: TarefaChecklistItem, concluido: boolean) => void;
  onDelete: (item: TarefaChecklistItem) => void;
  onEdit: (item: TarefaChecklistItem, conteudo: string) => void;
  busy: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.conteudo);
  useEffect(() => {
    setDraft(item.conteudo);
  }, [item.id, item.conteudo]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start justify-between gap-2 rounded-md p-2 hover:bg-muted/30"
    >
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <button
          type="button"
          className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground"
          {...attributes}
          {...listeners}
          title="Arraste para reordenar"
        >
          ⋮⋮
        </button>
        <div className="shrink-0 pt-0.5">
          <Checkbox
            checked={item.concluido}
            onCheckedChange={(v) => onToggle(item, Boolean(v))}
            disabled={busy}
          />
        </div>
        {editing ? (
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="h-8 min-w-0 flex-1"
            autoFocus
            onBlur={() => {
              setEditing(false);
              const next = draft.trim();
              if (next && next !== item.conteudo) onEdit(item, next);
              else setDraft(item.conteudo);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setEditing(false);
                setDraft(item.conteudo);
              }
            }}
          />
        ) : (
          <button
            type="button"
            className={
              item.concluido
                ? "min-w-0 flex-1 text-left text-sm break-words text-muted-foreground line-through [overflow-wrap:anywhere]"
                : "min-w-0 flex-1 text-left text-sm break-words hover:underline [overflow-wrap:anywhere]"
            }
            title="Clique para editar"
            onClick={() => setEditing(true)}
            disabled={busy}
          >
            {item.conteudo}
          </button>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0"
        onClick={() => onDelete(item)}
        disabled={busy}
        title="Remover item"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function countDoneKanbanTasks(list: Tarefa[]): number {
  return list.filter((t) => t.status === "DONE").length;
}

function filterKanbanTasksForDisplay(list: Tarefa[], hideDone: boolean): Tarefa[] {
  return hideDone ? list.filter((t) => t.status !== "DONE") : list;
}

function BoardColumn({
  id,
  title,
  count,
  doneCount,
  hideDone,
  onToggleHideDone,
  colorStyle,
  canPickColor,
  onColorChange,
  children,
  onCreateTask,
  canManage,
  onRename,
  onReorderHandleProps,
}: {
  id: string;
  title: string;
  count: number;
  doneCount: number;
  hideDone: boolean;
  onToggleHideDone?: () => void;
  colorStyle: ReturnType<typeof resolveKanbanCategoryColor>;
  canPickColor?: boolean;
  onColorChange?: (color: KanbanCategoryColorId) => void;
  children: React.ReactNode;
  onCreateTask?: () => void;
  canManage?: boolean;
  onRename?: (nextName: string) => void;
  onReorderHandleProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(title);

  useEffect(() => {
    setName(title);
  }, [title]);

  const activeCount = count - (hideDone ? doneCount : 0);

  return (
    <div ref={setNodeRef} className="w-full">
      <div
        className={cn(
          "flex max-h-[calc(100vh-16rem)] flex-col overflow-hidden rounded-lg border bg-muted/15",
          colorStyle.headerBorder,
          isOver && "ring-2 ring-primary/40",
        )}
      >
        <div className={cn("h-1 shrink-0", colorStyle.accentBar)} />
        <div
          className={cn(
            "shrink-0 space-y-2 border-b p-3 backdrop-blur-sm",
            colorStyle.headerBg,
            colorStyle.headerBorder,
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                {canPickColor && onColorChange ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "mt-0.5 h-5 w-5 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-background",
                          colorStyle.dot,
                          colorStyle.ring,
                        )}
                        title="Escolher cor da categoria"
                        aria-label="Escolher cor da categoria"
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" align="start">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">Cor da coluna</p>
                      <div className="grid grid-cols-7 gap-2">
                        {KANBAN_CATEGORY_COLOR_IDS.map((colorId) => (
                          <button
                            key={colorId}
                            type="button"
                            className={cn(
                              "h-6 w-6 rounded-full transition-transform hover:scale-110",
                              KANBAN_CATEGORY_COLORS[colorId].dot,
                              colorStyle.dot === KANBAN_CATEGORY_COLORS[colorId].dot &&
                                "ring-2 ring-foreground ring-offset-2 ring-offset-background",
                            )}
                            title={KANBAN_CATEGORY_COLORS[colorId].label}
                            onClick={() => onColorChange(colorId)}
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <span
                    className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", colorStyle.dot)}
                    aria-hidden
                  />
                )}
                <div className="min-w-0 flex-1">
                  {canManage && onRename ? (
                    editing ? (
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-8"
                        autoFocus
                        onBlur={() => {
                          setEditing(false);
                          const next = name.trim();
                          if (next && next !== title) onRename(next);
                          else setName(title);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            (e.target as HTMLInputElement).blur();
                          }
                          if (e.key === "Escape") {
                            e.preventDefault();
                            setEditing(false);
                            setName(title);
                          }
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="line-clamp-2 text-left text-sm font-semibold leading-snug hover:underline [overflow-wrap:anywhere]"
                        title="Clique para renomear"
                        onClick={() => setEditing(true)}
                      >
                        {title}
                      </button>
                    )
                  ) : (
                    <div className="line-clamp-2 text-sm font-semibold leading-snug [overflow-wrap:anywhere]">
                      {title}
                    </div>
                  )}
                  <div className="mt-1 text-xs text-muted-foreground">
                    {activeCount} ativa{activeCount === 1 ? "" : "s"}
                    {doneCount > 0 ? (
                      <span>
                        {" "}
                        · {doneCount} concluída{doneCount === 1 ? "" : "s"}
                        {hideDone ? " (ocultas)" : ""}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              {doneCount > 0 && onToggleHideDone ? (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={onToggleHideDone}
                  title={hideDone ? "Mostrar concluídas" : "Ocultar concluídas"}
                >
                  {hideDone ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
              ) : null}
              {onCreateTask ? (
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onCreateTask} title="Nova tarefa">
                  <Plus className="h-4 w-4" />
                </Button>
              ) : null}
              {canManage && onReorderHandleProps ? (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 cursor-grab active:cursor-grabbing"
                  title="Arraste para reordenar coluna"
                  {...onReorderHandleProps}
                >
                  ⋮⋮
                </Button>
              ) : null}
            </div>
          </div>
          {doneCount > 0 && onToggleHideDone ? (
            <button
              type="button"
              className="flex w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-left text-[11px] text-muted-foreground hover:bg-background/50 hover:text-foreground"
              onClick={onToggleHideDone}
            >
              {hideDone ? <Eye className="h-3.5 w-3.5 shrink-0" /> : <EyeOff className="h-3.5 w-3.5 shrink-0" />}
              {hideDone
                ? `Mostrar ${doneCount} concluída${doneCount === 1 ? "" : "s"}`
                : `Ocultar ${doneCount} concluída${doneCount === 1 ? "" : "s"}`}
            </button>
          ) : null}
        </div>
        <div className="min-h-[4.5rem] flex-1 space-y-2 overflow-y-auto overscroll-y-contain p-2">
          {children}
        </div>
      </div>
    </div>
  );
}

function SortableColumn({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className={KANBAN_COLUMN_WIDTH_CLASS}>
      <div className="w-full">
        {typeof children === "function"
          ? (children as any)({ attributes, listeners })
          : children}
      </div>
    </div>
  );
}

function SortableTaskCard({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
      {children}
    </div>
  );
}

function TaskRow({
  task,
  onOpen,
  assigneesText,
  variant = "lista",
  gestorMeta = false,
  criadorLabel,
  canChangeStatus,
  onChangeStatus,
}: {
  task: Tarefa;
  onOpen: () => void;
  assigneesText?: string;
  variant?: "lista" | "quadro";
  gestorMeta?: boolean;
  criadorLabel?: string;
  canChangeStatus?: boolean;
  onChangeStatus?: (s: TarefaStatus) => void;
}) {
  const due = task.due_date ? parseDateOnlyLocal(task.due_date) : null;
  const dueText = due ? format(due, "dd/MM/yyyy") : "—";
  const isOverdue = taskIsOpenOverdue(task);

  const leftBorder =
    task.status === "DONE"
      ? "border-l-4 border-l-emerald-500/70"
      : task.status === "BLOCKED"
        ? "border-l-4 border-l-rose-500/70"
        : task.status === "IN_PROGRESS"
          ? "border-l-4 border-l-amber-400/70"
          : "border-l-4 border-l-slate-400/70";

  const checklistTotal = task.checklist_total ?? 0;
  const checklistDone = task.checklist_done ?? 0;
  const checklistPct = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;
  const anexos = task.anexos_count ?? 0;
  const comentarios = task.comentarios_count ?? 0;

  const descLines = variant === "quadro" ? "line-clamp-3" : "line-clamp-2";
  const titleLines = variant === "quadro" ? "line-clamp-2" : "line-clamp-2";
  const minH = variant === "quadro" ? "min-h-[176px]" : "min-h-[132px]";
  const maxH = variant === "quadro" ? "max-h-[280px]" : "max-h-[220px]";

  const atualizadoRel =
    gestorMeta && task.updated_at
      ? formatDistanceToNow(new Date(task.updated_at), { addSuffix: true, locale: ptBR })
      : null;

  const showStatusActions = Boolean(canChangeStatus && onChangeStatus);
  const toggleComplete = () => {
    if (!onChangeStatus) return;
    onChangeStatus(task.status === "DONE" ? "TODO" : "DONE");
  };

  return (
    <div
      className={`flex w-full flex-col gap-1.5 rounded-lg border bg-card p-2.5 text-left transition hover:border-primary/40 hover:bg-muted/20 ${leftBorder} ${minH} ${maxH} overflow-hidden`}
    >
      <div className={`h-1 shrink-0 rounded-full ${statusBarClass(task.status)} opacity-70`} />

      <div className="flex min-w-0 items-start gap-2">
        {showStatusActions ? (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "mt-0.5 shrink-0 rounded-full p-0.5 transition-colors",
                    task.status === "DONE"
                      ? "text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                      : "text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400",
                  )}
                  onClick={(e) => {
                    stopCardActionPropagation(e);
                    toggleComplete();
                  }}
                  onPointerDown={stopCardActionPropagation}
                  aria-label={task.status === "DONE" ? "Reabrir tarefa" : "Marcar como concluída"}
                >
                  {task.status === "DONE" ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {task.status === "DONE" ? "Reabrir tarefa" : "Marcar como concluída"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}

        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left"
        >
          <div className={`font-medium leading-snug text-foreground ${titleLines} break-words [overflow-wrap:anywhere]`}>
            {task.title}
          </div>
        </button>
      </div>

      <button type="button" onClick={onOpen} className="flex min-h-0 flex-1 flex-col gap-1.5 text-left">
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
        </div>

        {task.description ? (
          <div
            className={`min-h-0 min-w-0 flex-1 text-sm leading-snug text-muted-foreground ${descLines} break-words [overflow-wrap:anywhere]`}
          >
            {task.description}
          </div>
        ) : (
          <div className="min-h-0 flex-1" />
        )}

        <div className="mt-auto shrink-0 space-y-1.5 border-t border-border/50 pt-1.5">
          <div className="flex items-center gap-2">
            <Progress
              value={checklistTotal > 0 ? checklistPct : 0}
              className="h-1.5 flex-1"
              indicatorClassName={progressColorClass(checklistPct) as any}
            />
            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
              {checklistDone}/{checklistTotal}
            </span>
          </div>

          <div className="flex flex-wrap items-start gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex shrink-0 items-center gap-1">
              <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
              <span className={isOverdue ? "font-medium text-destructive" : undefined}>{dueText}</span>
            </span>
            <span className="inline-flex min-w-0 max-w-full flex-[1_1_140px] items-start gap-1">
              <UserIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="break-words leading-snug [overflow-wrap:anywhere]">
                {assigneesText ?? (task.assignee_user_id ? `#${task.assignee_user_id}` : "—")}
              </span>
            </span>
            {anexos > 0 ? (
              <span className="inline-flex shrink-0 items-center gap-1">
                <Paperclip className="h-3.5 w-3.5" />
                {anexos}
              </span>
            ) : null}
            {gestorMeta ? (
              <span className="inline-flex shrink-0 items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                {comentarios}
              </span>
            ) : null}
          </div>

          {gestorMeta ? (
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] leading-tight text-muted-foreground">
              {criadorLabel ? (
                <span>
                  <span className="text-muted-foreground/80">Criador:</span> {criadorLabel}
                </span>
              ) : null}
              {atualizadoRel ? (
                <span>
                  <span className="text-muted-foreground/80">Atual.</span> {atualizadoRel}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </button>

      {showStatusActions ? (
        <div className="shrink-0 border-t border-border/40 pt-1.5">
          <TaskStatusQuickActions
            status={task.status}
            onChangeStatus={onChangeStatus!}
            compact={variant === "quadro"}
          />
        </div>
      ) : null}
    </div>
  );
}

export default function TarefasPage() {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();

  const canViewDept = hasPermission("tarefas.ver_departamento");
  const canCreate = hasPermission("tarefas.criar");
  const canCreateOwn = hasPermission("tarefas.criar_propria");
  const canCreateTask = canCreate || canCreateOwn;
  const assignOnlySelf = canCreateOwn && !canCreate;
  const canEdit = hasPermission("tarefas.editar");
  const canAssign = hasPermission("tarefas.atribuir");
  const canAssignGlobal = hasPermission("tarefas.atribuir_global");
  const canManageCategories = canCreate || canEdit;

  const departmentId = user?.departamento_id ?? null;

  const [searchParams, setSearchParams] = useSearchParams();

  const [tab, setTab] = useState<"minhas" | "departamento">("minhas");
  const viewKey = useMemo(() => `tarefas:viewMode:${user?.id ?? "anon"}`, [user?.id]);
  const [viewMode, setViewMode] = useState<"lista" | "quadro">("quadro");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<TarefaStatus | "ALL">("ALL");
  const [filtroAtrasadas, setFiltroAtrasadas] = useState(false);
  const [responsavelFiltro, setResponsavelFiltro] = useState<number | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "departamento" && canViewDept) {
      setTab("departamento");
    } else {
      setTab("minhas");
    }

    const st = searchParams.get("status");
    if (!st || st === "ALL") {
      setStatus("ALL");
    } else if (st === "TODO" || st === "IN_PROGRESS" || st === "BLOCKED" || st === "DONE") {
      setStatus(st);
    }

    setFiltroAtrasadas(searchParams.get("atrasadas") === "1");

    const r = searchParams.get("responsavel");
    if (r) {
      const n = Number(r);
      setResponsavelFiltro(Number.isFinite(n) && n > 0 ? n : null);
    } else {
      setResponsavelFiltro(null);
    }
  }, [searchParams, canViewDept]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(viewKey);
      if (saved === "lista" || saved === "quadro") setViewMode(saved);
      else setViewMode("quadro");
    } catch {
      setViewMode("quadro");
    }
  }, [viewKey]);

  const setAndPersistViewMode = (mode: "lista" | "quadro") => {
    setViewMode(mode);
    try {
      localStorage.setItem(viewKey, mode);
    } catch {}
  };

  const minhasQuery = useMinhasTarefas({
    q: q || undefined,
    status: status === "ALL" ? undefined : status,
  });

  const deptQuery = useTarefasDepartamento(
    departmentId ?? 0,
    {
      q: q || undefined,
      status: status === "ALL" ? undefined : status,
    },
    { enabled: !!departmentId && canViewDept },
  );

  const createMutation = useCreateTarefaDepartamento(departmentId ?? 0);
  const updateMutation = useUpdateTarefa();
  const assignMutation = useAtribuirTarefa();

  const categoriasQuery = useCategoriasTarefasDepartamento(departmentId ?? 0, {
    enabled: !!departmentId && !!user,
  });
  const createCategoriaMutation = useCreateCategoriaTarefasDepartamento(departmentId ?? 0);
  const updateCategoriaMutation = useUpdateCategoriaTarefas(departmentId ?? 0);
  const { isHideDone, toggleHideDone } = useKanbanColumnPrefs(user?.id);
  const [newCategoriaNome, setNewCategoriaNome] = useState("");

  // Nomes de responsáveis/autores e opções de atribuição. Usa rota própria do módulo
  // (não exige usuarios.acessar); se falhar, a UI cai graciosamente para o ID.
  const usuariosQuery = useUsuariosTarefas({ enabled: !!user });
  const departamentosQuery = useDepartamentos({ enabled: !!user });
  const departamentosById = useMemo(() => {
    const list = (departamentosQuery.data ?? []) as Departamento[];
    const map = new Map<number, Departamento>();
    for (const d of list) map.set(d.id, d);
    return map;
  }, [departamentosQuery.data]);
  const usuariosById = useMemo(() => {
    const list = (usuariosQuery.data ?? []) as TarefaUsuarioOpcao[];
    const map = new Map<number, TarefaUsuarioOpcao>();
    for (const u of list) map.set(u.id, u);
    return map;
  }, [usuariosQuery.data]);

  const assigneeNames = (t: Tarefa) => {
    const ids = (t.assignee_user_ids ?? (t.assignee_user_id ? [t.assignee_user_id] : [])) as number[];
    if (!ids || ids.length === 0) return "—";
    const names = ids
      .map((id) => usuariosById.get(id)?.nome ?? `#${id}`)
      .slice(0, 2);
    if (ids.length > 2) return `${names.join(", ")} +${ids.length - 2}`;
    return names.join(", ");
  };

  const assigneeNamesFull = (t: Tarefa) => {
    const ids = (t.assignee_user_ids ?? (t.assignee_user_id ? [t.assignee_user_id] : [])) as number[];
    if (!ids || ids.length === 0) return "—";
    return ids.map((id) => usuariosById.get(id)?.nome ?? `#${id}`).join(", ");
  };

  const taskCardVariant = viewMode === "quadro" ? "quadro" : "lista";
  const taskCardGestorMeta = tab === "departamento" && canViewDept;
  const criadorLabelFor = (t: Tarefa) => usuariosById.get(t.created_by_user_id)?.nome ?? `#${t.created_by_user_id}`;

  const atividadeLabel = (a: TarefaAtividade) => {
    switch (a.tipo) {
      case "TAREFA_CRIADA":
        return "Tarefa criada";
      case "STATUS_ATUALIZADO":
        return `Status: ${labelTarefaStatusHistorico(a.dados?.de)} → ${labelTarefaStatusHistorico(a.dados?.para)}`;
      case "CATEGORIA_MOVIDA":
        return "Categoria alterada";
      case "OBSERVACAO_ATUALIZADA":
        return "Observação atualizada";
      case "COMENTARIO_ADICIONADO":
        return "Comentário adicionado";
      case "CHECKLIST_ITEM_CRIADO":
        return "Checklist: item criado";
      case "CHECKLIST_ITEM_CONCLUIDO":
        return "Checklist: item concluído";
      case "CHECKLIST_ITEM_REABERTO":
        return "Checklist: item reaberto";
      case "CHECKLIST_ITEM_REMOVIDO":
        return "Checklist: item removido";
      case "ANEXO_ENVIADO":
        return `Anexo enviado: ${a.dados?.filename ?? ""}`.trim();
      case "ANEXO_REMOVIDO":
        return "Anexo removido";
      default:
        return a.tipo;
    }
  };

  const atividadeIcon = (a: TarefaAtividade) => {
    switch (a.tipo) {
      case "TAREFA_CRIADA":
        return <Circle className="h-4 w-4 text-muted-foreground" />;
      case "STATUS_ATUALIZADO":
        return <ArrowRight className="h-4 w-4 text-sky-500" />;
      case "CATEGORIA_MOVIDA":
        return <ArrowRight className="h-4 w-4 text-amber-400" />;
      case "OBSERVACAO_ATUALIZADA":
        return <Pencil className="h-4 w-4 text-muted-foreground" />;
      case "COMENTARIO_ADICIONADO":
        return <MessageCircle className="h-4 w-4 text-sky-500" />;
      case "CHECKLIST_ITEM_CRIADO":
        return <ListChecks className="h-4 w-4 text-muted-foreground" />;
      case "CHECKLIST_ITEM_CONCLUIDO":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "CHECKLIST_ITEM_REABERTO":
        return <Ban className="h-4 w-4 text-rose-500" />;
      case "CHECKLIST_ITEM_REMOVIDO":
        return <Trash2 className="h-4 w-4 text-rose-500" />;
      case "ANEXO_ENVIADO":
        return <FileUp className="h-4 w-4 text-sky-500" />;
      case "ANEXO_REMOVIDO":
        return <FileX2 className="h-4 w-4 text-rose-500" />;
      default:
        return <History className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const usuariosDoDepartamento = useMemo(() => {
    const list = (usuariosQuery.data ?? []) as TarefaUsuarioOpcao[];
    if (!departmentId) return [];
    return list.filter((u) => u.ativo && u.departamento_id === departmentId);
  }, [usuariosQuery.data, departmentId]);

  const usuariosAtivos = useMemo(() => {
    const list = (usuariosQuery.data ?? []) as TarefaUsuarioOpcao[];
    return list.filter((u) => u.ativo);
  }, [usuariosQuery.data]);

  const tasksFromApi = useMemo(() => {
    if (tab === "departamento" && canViewDept) return deptQuery.data ?? [];
    return minhasQuery.data ?? [];
  }, [tab, canViewDept, deptQuery.data, minhasQuery.data]);

  const tasks = useMemo(() => {
    let list = tasksFromApi;
    if (responsavelFiltro != null) {
      list = list.filter((t) => taskHasResponsavel(t, responsavelFiltro));
    }
    if (filtroAtrasadas) {
      list = list.filter((t) => taskIsOpenOverdue(t));
    }
    return list;
  }, [tasksFromApi, responsavelFiltro, filtroAtrasadas]);

  const categorias = useMemo(() => {
    const list = (categoriasQuery.data ?? []) as TarefaCategoria[];
    return [...list].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.id - b.id);
  }, [categoriasQuery.data]);

  const categoriasById = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of categorias) m.set(c.id, c.nome);
    return m;
  }, [categorias]);

  const loading =
    tab === "departamento" && canViewDept ? deptQuery.isLoading : minhasQuery.isLoading;

  const [createOpen, setCreateOpen] = useState(false);
  const [createCategoriaId, setCreateCategoriaId] = useState<number | null>(null);
  const [createCategoriaOpen, setCreateCategoriaOpen] = useState(false);
  const [createAssigneeOpen, setCreateAssigneeOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newObservacao, setNewObservacao] = useState("");
  const [newPriority, setNewPriority] = useState<TarefaPrioridade>("MEDIA");
  const [newDue, setNewDue] = useState<string>("");
  const [assignToMe, setAssignToMe] = useState(true);
  const [newAssignees, setNewAssignees] = useState<number[]>([]);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<Tarefa | null>(null);
  const [detailsTab, setDetailsTab] = useState<"resumo" | "anexos" | "comentarios" | "historico">("resumo");
  const [assigneeEditOpen, setAssigneeEditOpen] = useState(false);
  const [assigneeDraftIds, setAssigneeDraftIds] = useState<number[]>([]);
  const comentariosQuery = useComentariosTarefa(selected?.id ?? 0, { enabled: !!selected?.id && detailsOpen });
  const atividadesQuery = useAtividadesTarefa(selected?.id ?? 0, { enabled: !!selected?.id && detailsOpen });
  const createComentarioMutation = useCreateComentarioTarefa(selected?.id ?? 0);
  const [commentText, setCommentText] = useState("");

  const checklistQuery = useChecklistTarefa(selected?.id ?? 0, { enabled: !!selected?.id && detailsOpen });
  const createChecklistItemMutation = useCreateChecklistItemTarefa(selected?.id ?? 0);
  const updateChecklistItemMutation = useUpdateChecklistItemTarefa(selected?.id ?? 0);
  const deleteChecklistItemMutation = useDeleteChecklistItemTarefa(selected?.id ?? 0);
  const [newChecklistText, setNewChecklistText] = useState("");

  const anexosQuery = useAnexosTarefa(selected?.id ?? 0, { enabled: !!selected?.id && detailsOpen });
  const uploadAnexoMutation = useUploadAnexoTarefa(selected?.id ?? 0);
  const deleteAnexoMutation = useDeleteAnexoTarefa(selected?.id ?? 0);
  const [uploadingNames, setUploadingNames] = useState<string[]>([]);
  const anexoFileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    if (!departmentId) {
      toast({
        title: "Sem departamento",
        description: "Seu usuário não possui departamento vinculado.",
        variant: "destructive",
      });
      return;
    }
    if (!newTitle.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Informe um título para a tarefa.",
        variant: "destructive",
      });
      return;
    }

    try {
      const assignee_user_ids = canAssign
        ? (newAssignees.length ? newAssignees : undefined)
        : assignOnlySelf && user?.id
          ? [user.id]
          : assignToMe && user?.id
            ? [user.id]
            : undefined;

      await createMutation.mutateAsync({
        title: newTitle.trim(),
        description: newDescription.trim() ? newDescription.trim() : undefined,
        observacao: newObservacao.trim() ? newObservacao.trim() : undefined,
        priority: newPriority,
        due_date: newDue ? newDue : undefined,
        assignee_user_ids,
        categoria_id: createCategoriaId ?? undefined,
      });
      setCreateOpen(false);
      setNewTitle("");
      setNewDescription("");
      setNewObservacao("");
      setNewPriority("MEDIA");
      setNewDue("");
      setAssignToMe(true);
      setNewAssignees([]);
      setCreateCategoriaId(null);
      toast({ title: "Tarefa criada", description: "A tarefa foi criada com sucesso." });
    } catch (err) {
      toast({
        title: "Erro ao criar tarefa",
        description: err instanceof Error ? err.message : "Não foi possível criar.",
        variant: "destructive",
      });
    }
  };

  const openInlineCreateForCategory = (categoriaId: number | null) => {
    setCreateCategoriaId(categoriaId);
    setCreateOpen(true);
  };

  const handleChangeStatus = async (tarefaId: number, s: TarefaStatus) => {
    try {
      const updated = await updateMutation.mutateAsync({ tarefaId, data: { status: s } });
      setSelected((prev) => (prev && prev.id === tarefaId ? updated : prev));
      toast({ title: "Status atualizado" });
    } catch (err) {
      toast({
        title: "Erro ao atualizar",
        description: err instanceof Error ? err.message : "Não foi possível atualizar.",
        variant: "destructive",
      });
    }
  };

  const canChangeStatusForTask = (t: Tarefa) => canUserUpdateTaskStatus(t, user?.id, canEdit);

  const handleMoveTask = async (tarefaId: number, categoriaId: number | null, ordem: number) => {
    try {
      const updated = await updateMutation.mutateAsync({
        tarefaId,
        data: { categoria_id: categoriaId, categoria_ordem: ordem },
      });
      setSelected((prev) => (prev && prev.id === tarefaId ? updated : prev));
    } catch (err) {
      toast({
        title: "Erro ao mover tarefa",
        description: err instanceof Error ? err.message : "Não foi possível mover.",
        variant: "destructive",
      });
    }
  };

  const taskIdToColumn = useMemo(() => {
    const m = new Map<number, string>();
    for (const t of tasks) {
      m.set(t.id, t.categoria_id ? `col-${t.categoria_id}` : "col-none");
    }
    return m;
  }, [tasks]);

  const boardSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleBoardDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    // Reordenar colunas (somente gestor)
    if (activeId.startsWith("column-") && overId.startsWith("column-")) {
      if (!canManageCategories) return;
      const activeCatId = Number(activeId.replace("column-", ""));
      const overCatId = Number(overId.replace("column-", ""));
      if (!activeCatId || !overCatId || activeCatId === overCatId) return;
      const ids = categorias.map((c) => c.id);
      const oldIndex = ids.indexOf(activeCatId);
      const newIndex = ids.indexOf(overCatId);
      if (oldIndex < 0 || newIndex < 0) return;
      const next = [...ids];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      try {
        await Promise.all(
          next.map((cid, idx) =>
            updateCategoriaMutation.mutateAsync({ categoriaId: cid, data: { ordem: idx } }),
          ),
        );
      } catch (err) {
        toast({
          title: "Erro ao reordenar colunas",
          description: err instanceof Error ? err.message : "Não foi possível reordenar.",
          variant: "destructive",
        });
      }
      return;
    }

    if (!activeId.startsWith("task-")) return;
    const taskId = Number(activeId.replace("task-", ""));
    if (!taskId) return;

    const sourceCol = taskIdToColumn.get(taskId) ?? "col-none";
    const destCol =
      overId.startsWith("col-")
        ? overId
        : overId.startsWith("task-")
          ? taskIdToColumn.get(Number(overId.replace("task-", ""))) ?? "col-none"
          : "col-none";

    // construir arrays atuais
    const getList = (col: string) => (groupedBoard.get(col.replace("col-", "")) ?? []).map((t) => t.id);
    const sourceIds = getList(sourceCol);
    const destIds = sourceCol === destCol ? sourceIds : getList(destCol);

    const fromIdx = sourceIds.indexOf(taskId);
    if (fromIdx < 0) return;
    let toIdx = destIds.length;
    if (overId.startsWith("task-")) {
      const overTaskId = Number(overId.replace("task-", ""));
      const idx = destIds.indexOf(overTaskId);
      if (idx >= 0) toIdx = idx;
    }

    // remover do source
    sourceIds.splice(fromIdx, 1);
    // inserir no destino
    const nextDest = sourceCol === destCol ? sourceIds : destIds;
    nextDest.splice(toIdx, 0, taskId);

    const categoriaId = destCol === "col-none" ? null : Number(destCol.replace("col-", ""));

    // Persistir ordens (somente colunas afetadas)
    try {
      const ops: Array<Promise<any>> = [];
      // destino
      nextDest.forEach((id, idx) => {
        ops.push(handleMoveTask(id, categoriaId, idx));
      });
      // source se mudou
      if (sourceCol !== destCol) {
        const sourceCategoriaId = sourceCol === "col-none" ? null : Number(sourceCol.replace("col-", ""));
        sourceIds.forEach((id, idx) => {
          ops.push(handleMoveTask(id, sourceCategoriaId, idx));
        });
      }
      await Promise.all(ops);
    } catch {
      // handleMoveTask já faz toast
    }
  };

  const groupedBoard = useMemo(() => {
    const map = new Map<string, Tarefa[]>();
    map.set("none", []);
    for (const c of categorias) map.set(String(c.id), []);
    for (const t of tasks) {
      const key = t.categoria_id ? String(t.categoria_id) : "none";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    for (const [k, list] of map.entries()) {
      list.sort((a, b) => (a.categoria_ordem ?? 0) - (b.categoria_ordem ?? 0) || a.id - b.id);
      map.set(k, list);
    }
    return map;
  }, [tasks, categorias]);

  const noneBoardList = groupedBoard.get("none") ?? [];
  const noneBoardDoneCount = countDoneKanbanTasks(noneBoardList);
  const noneBoardHideDone = isHideDone("none");
  const noneBoardVisible = filterKanbanTasksForDisplay(noneBoardList, noneBoardHideDone);
  const noneBoardColor = resolveKanbanCategoryColor("slate");

  const handleRefresh = () => {
    if (tab === "departamento" && canViewDept) return deptQuery.refetch();
    return minhasQuery.refetch();
  };

  const openDetails = (t: Tarefa) => {
    setSelected(t);
    const ids = (t.assignee_user_ids ?? (t.assignee_user_id ? [t.assignee_user_id] : [])) as number[];
    setAssigneeDraftIds(ids);
    setCommentText("");
    setNewChecklistText("");
    setDetailsTab("resumo");
    setDetailsOpen(true);
  };

  // Abrir detalhes via querystring (?tarefaId=123) — usado pelo Calendário
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const raw = sp.get("tarefaId");
    if (!raw) return;
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) return;

    const list = tasksFromApi as Tarefa[];
    const found = list.find((t) => t.id === id);
    if (!found) return;

    openDetails(found);
    // limpar param para não reabrir ao navegar
    sp.delete("tarefaId");
    const next = sp.toString();
    navigate({ pathname: location.pathname, search: next ? `?${next}` : "" }, { replace: true });
  }, [location.search, tasksFromApi]);

  const canUpdateSelectedStatus = useMemo(() => {
    if (!user || !selected) return false;
    if (canEdit) return true;
    const ids = (selected.assignee_user_ids ??
      (selected.assignee_user_id ? [selected.assignee_user_id] : [])) as number[];
    if (ids.includes(user.id)) return true;
    if (selected.created_by_user_id === user.id) return true;
    return false;
  }, [user, selected, canEdit]);

  const handleSendComment = async () => {
    if (!selected) return;
    if (!commentText.trim()) return;
    try {
      await createComentarioMutation.mutateAsync({ conteudo: commentText.trim() });
      setCommentText("");
      toast({ title: "Comentário enviado" });
    } catch (err) {
      toast({
        title: "Erro ao comentar",
        description: err instanceof Error ? err.message : "Não foi possível comentar.",
        variant: "destructive",
      });
    }
  };

  const checklistStats = useMemo(() => {
    const items = (checklistQuery.data ?? []) as TarefaChecklistItem[];
    const total = items.length;
    const done = items.filter((i) => i.concluido).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    return { total, done, percent };
  }, [checklistQuery.data]);

  const sortedChecklist = useMemo(() => {
    const items = (checklistQuery.data ?? []) as TarefaChecklistItem[];
    return [...items].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.id - b.id);
  }, [checklistQuery.data]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!selected) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const items = sortedChecklist;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = [...items];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);

    // Persistir a ordem (ordem incremental)
    try {
      await Promise.all(
        next.map((it, idx) =>
          updateChecklistItemMutation.mutateAsync({ itemId: it.id, data: { ordem: idx } }),
        ),
      );
    } catch (err) {
      toast({
        title: "Erro ao reordenar",
        description: err instanceof Error ? err.message : "Não foi possível reordenar.",
        variant: "destructive",
      });
    }
  };

  const handleAddChecklistItem = async () => {
    if (!selected) return;
    if (!newChecklistText.trim()) return;
    try {
      await createChecklistItemMutation.mutateAsync({ conteudo: newChecklistText.trim() });
      setNewChecklistText("");
      toast({ title: "Item adicionado" });
    } catch (err) {
      toast({
        title: "Erro ao adicionar item",
        description: err instanceof Error ? err.message : "Não foi possível adicionar.",
        variant: "destructive",
      });
    }
  };

  const handleToggleChecklistItem = async (item: TarefaChecklistItem, concluido: boolean) => {
    if (!selected) return;
    try {
      await updateChecklistItemMutation.mutateAsync({ itemId: item.id, data: { concluido } });
    } catch (err) {
      toast({
        title: "Erro ao atualizar item",
        description: err instanceof Error ? err.message : "Não foi possível atualizar.",
        variant: "destructive",
      });
    }
  };

  const handleEditChecklistItem = async (item: TarefaChecklistItem, conteudo: string) => {
    if (!selected) return;
    try {
      await updateChecklistItemMutation.mutateAsync({ itemId: item.id, data: { conteudo } });
      toast({ title: "Item atualizado" });
    } catch (err) {
      toast({
        title: "Erro ao editar item",
        description: err instanceof Error ? err.message : "Não foi possível editar.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteChecklistItem = async (item: TarefaChecklistItem) => {
    if (!selected) return;
    try {
      await deleteChecklistItemMutation.mutateAsync(item.id);
      toast({ title: "Item removido" });
    } catch (err) {
      toast({
        title: "Erro ao remover item",
        description: err instanceof Error ? err.message : "Não foi possível remover.",
        variant: "destructive",
      });
    }
  };

  const handleUploadFiles = async (files: FileList | null) => {
    if (!selected) return;
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setUploadingNames(list.map((f) => f.name));
    try {
      for (const f of list) {
        await uploadAnexoMutation.mutateAsync(f);
      }
      toast({ title: "Anexo(s) enviado(s)" });
    } catch (err) {
      toast({
        title: "Erro no upload",
        description: err instanceof Error ? err.message : "Não foi possível enviar o anexo.",
        variant: "destructive",
      });
    } finally {
      setUploadingNames([]);
    }
  };

  const handleDeleteAnexo = async (anexo: TarefaAnexo) => {
    if (!selected) return;
    try {
      await deleteAnexoMutation.mutateAsync(anexo.id);
      toast({ title: "Anexo removido" });
    } catch (err) {
      toast({
        title: "Erro ao remover anexo",
        description: err instanceof Error ? err.message : "Não foi possível remover.",
        variant: "destructive",
      });
    }
  };

  const [observacaoDraft, setObservacaoDraft] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [descDraft, setDescDraft] = useState("");
  const [dueDraft, setDueDraft] = useState("");
  useEffect(() => {
    setObservacaoDraft(selected?.observacao ?? "");
    setTitleDraft(selected?.title ?? "");
    setDescDraft(selected?.description ?? "");
    setDueDraft(selected?.due_date ?? "");
  }, [selected?.id]);

  const saveObservacao = async (value: string) => {
    if (!selected) return;
    const id = selected.id;
    try {
      const updated = await updateMutation.mutateAsync({
        tarefaId: id,
        data: { observacao: value.trim() ? value : null },
      });
      setSelected((prev) => (prev && prev.id === id ? updated : prev));
    } catch (err) {
      toast({
        title: "Erro ao salvar observação",
        description: err instanceof Error ? err.message : "Não foi possível salvar.",
        variant: "destructive",
      });
    }
  };

  // Auto-save: debounce + também salva ao sair do campo (blur)
  const [obsSaving, setObsSaving] = useState(false);
  useEffect(() => {
    if (!selected) return;
    const current = observacaoDraft ?? "";
    const t = window.setTimeout(async () => {
      setObsSaving(true);
      await saveObservacao(current);
      setObsSaving(false);
    }, 800);
    return () => window.clearTimeout(t);
  }, [observacaoDraft, selected?.id]);

  const canEditBasicFields = useMemo(() => {
    if (!user || !selected) return false;
    if (canEdit) return true;
    const ids = (selected.assignee_user_ids ??
      (selected.assignee_user_id ? [selected.assignee_user_id] : [])) as number[];
    if (ids.includes(user.id)) return true;
    if (selected.created_by_user_id === user.id) return true;
    return false;
  }, [user, selected, canEdit]);

  const saveDueDateIfChanged = async () => {
    if (!selected || !canEditBasicFields) return;
    const id = selected.id;
    const next = dueDraft.trim();
    const cur = selected.due_date ?? "";
    if (next === cur) return;
    try {
      const updated = await updateMutation.mutateAsync({
        tarefaId: id,
        data: { due_date: next ? next : null },
      });
      setSelected((prev) => (prev && prev.id === id ? updated : prev));
    } catch (err) {
      toast({
        title: "Erro ao salvar prazo",
        description: err instanceof Error ? err.message : "Não foi possível salvar o prazo.",
        variant: "destructive",
      });
      setDueDraft(cur);
    }
  };

  const [basicSaving, setBasicSaving] = useState(false);
  useEffect(() => {
    if (!selected || !canEditBasicFields) return;
    const t = window.setTimeout(async () => {
      const nextTitle = (titleDraft ?? "").trim();
      const nextDesc = (descDraft ?? "").trim();
      const changedTitle = nextTitle !== (selected.title ?? "");
      const changedDesc = nextDesc !== ((selected.description ?? "") || "");
      if (!changedTitle && !changedDesc) return;
      setBasicSaving(true);
      try {
        const updated = await updateMutation.mutateAsync({
          tarefaId: selected.id,
          data: {
            title: changedTitle ? nextTitle : undefined,
            description: changedDesc ? (nextDesc ? nextDesc : null) : undefined,
          },
        });
        setSelected((prev) => (prev && prev.id === selected.id ? updated : prev));
      } catch (err) {
        toast({
          title: "Erro ao salvar",
          description: err instanceof Error ? err.message : "Não foi possível salvar.",
          variant: "destructive",
        });
      } finally {
        setBasicSaving(false);
      }
    }, 900);
    return () => window.clearTimeout(t);
  }, [titleDraft, descDraft, selected?.id, canEditBasicFields]);

  const handleAssign = async (tarefaId: number, assigneeUserIds: number[]) => {
    try {
      const updated = await assignMutation.mutateAsync({
        tarefaId,
        data: { assignee_user_ids: assigneeUserIds },
      });
      setSelected((prev) => (prev && prev.id === tarefaId ? updated : prev));
      toast({ title: "Responsáveis atualizados" });
    } catch (err) {
      toast({
        title: "Erro ao atribuir",
        description: err instanceof Error ? err.message : "Não foi possível atribuir.",
        variant: "destructive",
      });
    }
  };

  return (
    <AppPage maxWidth="full" className="min-w-0">
      <div className="mb-4 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Tarefas</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe suas tarefas e, se for gestor, a triagem do departamento.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <div className="flex-1 flex items-center gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por título/descrição..."
            />
            <Select
              value={status}
              onValueChange={(v) => {
                const nv = v as TarefaStatus | "ALL";
                setStatus(nv);
                setSearchParams(
                  (prev) => {
                    const n = new URLSearchParams(prev);
                    if (nv === "ALL") n.delete("status");
                    else n.set("status", nv);
                    return n;
                  },
                  { replace: true },
                );
              }}
            >
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="TODO">A fazer</SelectItem>
                <SelectItem value="IN_PROGRESS">Em andamento</SelectItem>
                <SelectItem value="BLOCKED">Bloqueada</SelectItem>
                <SelectItem value="DONE">Concluída</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            {viewMode === "quadro" ? (
              <Button variant="outline" onClick={() => setAndPersistViewMode("lista")} title="Ver em lista">
                <LayoutGrid className="h-4 w-4 mr-2" />
                Lista
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setAndPersistViewMode("quadro")} title="Voltar ao quadro">
                <Columns3 className="h-4 w-4 mr-2" />
                Quadro
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" asChild>
              <Link to="/tarefas/indicadores" className="inline-flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Indicadores
              </Link>
            </Button>
            {canCreateTask ? (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  disabled={!departmentId}
                  onClick={() => setCreateCategoriaId(null)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova tarefa
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Criar tarefa</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título</Label>
                    <Input
                      id="title"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Ex.: Revisar contrato, Atualizar inventário..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desc">Descrição (opcional)</Label>
                    <Input
                      id="desc"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Contexto, critérios, links..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="obs">Observação (opcional)</Label>
                    <Textarea
                      id="obs"
                      value={newObservacao}
                      onChange={(e) => setNewObservacao(e.target.value)}
                      placeholder="Anotações, contexto extra, links..."
                      className="min-h-[88px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Categoria (opcional)</Label>
                    <Popover open={createCategoriaOpen} onOpenChange={setCreateCategoriaOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between"
                        >
                          {createCategoriaId
                            ? categoriasById.get(createCategoriaId) ?? `#${createCategoriaId}`
                            : "Sem categoria"}
                          <ChevronsUpDown className="h-4 w-4 opacity-60" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar categoria..." />
                          <CommandList>
                            <CommandEmpty>Nenhuma categoria.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="none"
                                onSelect={() => {
                                  setCreateCategoriaId(null);
                                  setCreateCategoriaOpen(false);
                                }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${createCategoriaId === null ? "opacity-100" : "opacity-0"}`} />
                                Sem categoria
                              </CommandItem>
                              {categorias.map((c) => (
                                <CommandItem
                                  key={c.id}
                                  value={`${c.nome} ${c.id}`}
                                  onSelect={() => {
                                    setCreateCategoriaId(c.id);
                                    setCreateCategoriaOpen(false);
                                  }}
                                >
                                  <Check className={`mr-2 h-4 w-4 ${createCategoriaId === c.id ? "opacity-100" : "opacity-0"}`} />
                                  {c.nome}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <div className="text-xs text-muted-foreground">
                      Se não escolher, a tarefa fica em “Sem categoria”.
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Prioridade</Label>
                      <Select value={newPriority} onValueChange={(v) => setNewPriority(v as TarefaPrioridade)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BAIXA">Baixa</SelectItem>
                          <SelectItem value="MEDIA">Média</SelectItem>
                          <SelectItem value="ALTA">Alta</SelectItem>
                          <SelectItem value="URGENTE">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="due">Prazo (opcional)</Label>
                      <Input id="due" type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} />
                    </div>
                  </div>

                  {canAssign ? (
                    <div className="space-y-2">
                      <Label>Responsáveis</Label>
                      <Popover open={createAssigneeOpen} onOpenChange={setCreateAssigneeOpen}>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="outline" className="w-full justify-between">
                            {newAssignees.length
                              ? `${newAssignees.length} selecionado(s)`
                              : "Sem responsáveis"}
                            <ChevronsUpDown className="h-4 w-4 opacity-60" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar usuário..." />
                            <CommandList>
                              <CommandEmpty>Nenhum usuário.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value={`me ${user?.nome ?? ""}`}
                                  onSelect={() => {
                                    if (!user?.id) return;
                                    setNewAssignees((prev) =>
                                      prev.includes(user.id) ? prev.filter((x) => x !== user.id) : [...prev, user.id],
                                    );
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${user?.id && newAssignees.includes(user.id) ? "opacity-100" : "opacity-0"}`}
                                  />
                                  Eu ({user?.nome ?? "meu usuário"})
                                </CommandItem>
                                <CommandItem
                                  value="clear"
                                  onSelect={() => {
                                    setNewAssignees([]);
                                  }}
                                >
                                  <Check className={`mr-2 h-4 w-4 ${newAssignees.length === 0 ? "opacity-100" : "opacity-0"}`} />
                                  Sem responsáveis
                                </CommandItem>
                              </CommandGroup>
                              <CommandGroup heading="Usuários">
                                {(canAssignGlobal ? usuariosAtivos : usuariosDoDepartamento).map((u) => (
                                  <CommandItem
                                    key={u.id}
                                    value={`${u.nome} ${u.email ?? ""} ${u.id}`}
                                    onSelect={() => {
                                      setNewAssignees((prev) =>
                                        prev.includes(u.id) ? prev.filter((x) => x !== u.id) : [...prev, u.id],
                                      );
                                    }}
                                  >
                                    <Check className={`mr-2 h-4 w-4 ${newAssignees.includes(u.id) ? "opacity-100" : "opacity-0"}`} />
                                    <div className="min-w-0">
                                      <div className="truncate">{u.nome}</div>
                                      {canAssignGlobal ? (
                                        <div className="text-xs text-muted-foreground truncate">
                                          {u.departamento_id
                                            ? `Depto: ${departamentosById.get(u.departamento_id)?.nome ?? `#${u.departamento_id}`}`
                                            : "Sem departamento"}
                                        </div>
                                      ) : null}
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {newAssignees.length ? (
                        <div className="flex flex-wrap gap-1">
                          {newAssignees.map((id) => (
                            <Badge
                              key={id}
                              variant="secondary"
                              className="gap-1"
                              onClick={() => setNewAssignees((prev) => prev.filter((x) => x !== id))}
                            >
                              <UserIcon className="h-3 w-3" />
                              {usuariosById.get(id)?.nome ?? `#${id}`}
                              <span className="ml-1 text-muted-foreground">×</span>
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                      <div className="text-xs text-muted-foreground">
                        {canAssignGlobal
                          ? "Você pode atribuir a qualquer usuário do sistema."
                          : "Como gestor, você pode criar tarefas já atribuídas a alguém do seu departamento."}
                      </div>
                    </div>
                  ) : assignOnlySelf ? (
                    <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
                      Esta tarefa será criada automaticamente para você. Você não pode atribuir tarefas a outros
                      usuários.
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-md border p-3 bg-muted/30">
                      <div>
                        <div className="font-medium text-sm">Atribuir a mim</div>
                        <div className="text-xs text-muted-foreground">
                          A criação pode atribuir automaticamente ao seu usuário.
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant={assignToMe ? "default" : "outline"}
                        onClick={() => setAssignToMe((v) => !v)}
                      >
                        {assignToMe ? "Sim" : "Não"}
                      </Button>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreate} disabled={createMutation.isPending}>
                    Criar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null}
          </div>
        </div>

        {(filtroAtrasadas || responsavelFiltro != null) && (
          <div className="flex flex-col gap-2 rounded-lg border border-sky-500/25 bg-sky-500/5 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="text-muted-foreground">
              {filtroAtrasadas ? (
                <span>
                  Filtro do painel: <strong className="text-foreground">somente atrasadas</strong>
                </span>
              ) : null}
              {filtroAtrasadas && responsavelFiltro != null ? <span className="hidden sm:inline"> · </span> : null}
              {responsavelFiltro != null ? (
                <span>
                  {!filtroAtrasadas ? (
                    <>
                      Filtro do painel:{" "}
                    </>
                  ) : null}
                  <strong className="text-foreground">
                    responsável {usuariosById.get(responsavelFiltro)?.nome ?? `#${responsavelFiltro}`}
                  </strong>
                </span>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => {
                setSearchParams(
                  (prev) => {
                    const n = new URLSearchParams(prev);
                    n.delete("atrasadas");
                    n.delete("responsavel");
                    return n;
                  },
                  { replace: true },
                );
              }}
            >
              Limpar filtros do painel
            </Button>
          </div>
        )}

        <Tabs value={tab} onValueChange={(v) => {
          const next = v as "minhas" | "departamento";
          setTab(next);
          setSearchParams(
            (prev) => {
              const n = new URLSearchParams(prev);
              n.set("tab", next);
              return n;
            },
            { replace: true },
          );
        }}>
          <TabsList>
            <TabsTrigger value="minhas">Minhas tarefas</TabsTrigger>
            {canViewDept ? <TabsTrigger value="departamento">Triagem do departamento</TabsTrigger> : null}
          </TabsList>

          <TabsContent value="minhas" className="mt-4">
            {viewMode === "quadro" && departmentId ? (
              <div className="space-y-3">
                {canManageCategories ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={newCategoriaNome}
                      onChange={(e) => setNewCategoriaNome(e.target.value)}
                      placeholder="Nova categoria (ex.: Financeiro, Contratos...)"
                      className="max-w-sm"
                    />
                    <Button
                      type="button"
                      onClick={async () => {
                        if (!newCategoriaNome.trim() || !departmentId) return;
                        try {
                          await createCategoriaMutation.mutateAsync({
                            nome: newCategoriaNome.trim(),
                            cor: suggestKanbanCategoryColor(categorias.length),
                          });
                          setNewCategoriaNome("");
                          toast({ title: "Categoria criada" });
                        } catch (err) {
                          toast({
                            title: "Erro ao criar categoria",
                            description: err instanceof Error ? err.message : "Não foi possível criar.",
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={createCategoriaMutation.isPending}
                    >
                      Criar categoria
                    </Button>
                  </div>
                ) : null}

                <DndContext
                  sensors={boardSensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleBoardDragEnd}
                >
                  <KanbanBoardScroller columnCount={categorias.length + 1}>
                    <SortableContext
                      items={categorias.map((c) => `column-${c.id}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className={KANBAN_COLUMN_WIDTH_CLASS}>
                      <BoardColumn
                        id="col-none"
                        title="Sem categoria"
                        count={noneBoardList.length}
                        doneCount={noneBoardDoneCount}
                        hideDone={noneBoardHideDone}
                        onToggleHideDone={() => toggleHideDone("none")}
                        colorStyle={noneBoardColor}
                        onCreateTask={canCreateTask ? () => openInlineCreateForCategory(null) : undefined}
                      >
                        {noneBoardVisible.length === 0 ? (
                          <div className="text-sm text-muted-foreground">
                            {noneBoardList.length === 0
                              ? "Arraste uma tarefa aqui."
                              : "Todas as tarefas estão concluídas e ocultas."}
                          </div>
                        ) : (
                          <SortableContext
                            items={noneBoardVisible.map((t) => `task-${t.id}`)}
                            strategy={verticalListSortingStrategy}
                          >
                            {noneBoardVisible.map((t) => (
                              <SortableTaskCard key={t.id} id={`task-${t.id}`}>
                                <TaskRow
                                  task={t}
                                  canChangeStatus={canChangeStatusForTask(t)}
                                  onChangeStatus={(s) => handleChangeStatus(t.id, s)}
                                  onOpen={() => openDetails(t)}
                                  assigneesText={taskCardGestorMeta ? assigneeNamesFull(t) : assigneeNames(t)}
                                  variant={taskCardVariant}
                                  gestorMeta={taskCardGestorMeta}
                                  criadorLabel={criadorLabelFor(t)}
                                />
                              </SortableTaskCard>
                            ))}
                          </SortableContext>
                        )}
                      </BoardColumn>
                      </div>

                      {categorias.map((c) => {
                        const key = String(c.id);
                        const list = groupedBoard.get(key) ?? [];
                        const columnKey = `cat-${c.id}`;
                        const hideDoneCol = isHideDone(columnKey);
                        const visibleList = filterKanbanTasksForDisplay(list, hideDoneCol);
                        const doneCountCol = countDoneKanbanTasks(list);
                        const colorStyle = resolveKanbanCategoryColor(c.cor);
                        return (
                          <SortableColumn key={c.id} id={`column-${c.id}`}>
                            {({ attributes, listeners }: any) => (
                              <BoardColumn
                                id={`col-${c.id}`}
                                title={c.nome}
                                count={list.length}
                                doneCount={doneCountCol}
                                hideDone={hideDoneCol}
                                onToggleHideDone={() => toggleHideDone(columnKey)}
                                colorStyle={colorStyle}
                                canPickColor={canManageCategories}
                                onColorChange={
                                  canManageCategories
                                    ? async (colorId) => {
                                        try {
                                          await updateCategoriaMutation.mutateAsync({
                                            categoriaId: c.id,
                                            data: { cor: colorId },
                                          });
                                        } catch (err) {
                                          toast({
                                            title: "Erro ao alterar cor",
                                            description:
                                              err instanceof Error ? err.message : "Não foi possível salvar a cor.",
                                            variant: "destructive",
                                          });
                                        }
                                      }
                                    : undefined
                                }
                                onCreateTask={canCreateTask ? () => openInlineCreateForCategory(c.id) : undefined}
                                canManage={canManageCategories}
                                onRename={async (nextName) => {
                                  if (!canManageCategories) return;
                                  try {
                                    await updateCategoriaMutation.mutateAsync({
                                      categoriaId: c.id,
                                      data: { nome: nextName },
                                    });
                                    toast({ title: "Categoria renomeada" });
                                  } catch (err) {
                                    toast({
                                      title: "Erro ao renomear",
                                      description: err instanceof Error ? err.message : "Não foi possível renomear.",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                                onReorderHandleProps={{
                                  ...attributes,
                                  ...listeners,
                                  onClick: (e) => e.preventDefault(),
                                }}
                              >
                                {visibleList.length === 0 ? (
                                  <div className="text-sm text-muted-foreground">
                                    {list.length === 0
                                      ? "Arraste uma tarefa aqui."
                                      : "Todas as tarefas estão concluídas e ocultas."}
                                  </div>
                                ) : (
                                  <SortableContext
                                    items={visibleList.map((t) => `task-${t.id}`)}
                                    strategy={verticalListSortingStrategy}
                                  >
                                    {visibleList.map((t) => (
                                      <SortableTaskCard key={t.id} id={`task-${t.id}`}>
                                        <TaskRow
                                          task={t}
                                          canChangeStatus={canChangeStatusForTask(t)}
                                          onChangeStatus={(s) => handleChangeStatus(t.id, s)}
                                          onOpen={() => openDetails(t)}
                                          assigneesText={taskCardGestorMeta ? assigneeNamesFull(t) : assigneeNames(t)}
                                          variant={taskCardVariant}
                                          gestorMeta={taskCardGestorMeta}
                                          criadorLabel={criadorLabelFor(t)}
                                        />
                                      </SortableTaskCard>
                                    ))}
                                  </SortableContext>
                                )}
                              </BoardColumn>
                            )}
                          </SortableColumn>
                        );
                      })}
                    </SortableContext>
                  </KanbanBoardScroller>
                </DndContext>
              </div>
            ) : loading ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : tasks.length === 0 ? (
              <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
                Nenhuma tarefa encontrada.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {tasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    canChangeStatus={canChangeStatusForTask(t)}
                    onChangeStatus={(s) => handleChangeStatus(t.id, s)}
                    onOpen={() => openDetails(t)}
                    assigneesText={taskCardGestorMeta ? assigneeNamesFull(t) : assigneeNames(t)}
                    variant={taskCardVariant}
                    gestorMeta={taskCardGestorMeta}
                    criadorLabel={criadorLabelFor(t)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {canViewDept ? (
            <TabsContent value="departamento" className="mt-4">
              {!departmentId ? (
                <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
                  Seu usuário não possui departamento vinculado.
                </div>
              ) : viewMode === "quadro" ? (
                <div className="space-y-3">
                  {canManageCategories ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        value={newCategoriaNome}
                        onChange={(e) => setNewCategoriaNome(e.target.value)}
                        placeholder="Nova categoria (ex.: Financeiro, Contratos...)"
                        className="max-w-sm"
                      />
                      <Button
                        type="button"
                        onClick={async () => {
                          if (!newCategoriaNome.trim() || !departmentId) return;
                          try {
                            await createCategoriaMutation.mutateAsync({
                              nome: newCategoriaNome.trim(),
                              cor: suggestKanbanCategoryColor(categorias.length),
                            });
                            setNewCategoriaNome("");
                            toast({ title: "Categoria criada" });
                          } catch (err) {
                            toast({
                              title: "Erro ao criar categoria",
                              description: err instanceof Error ? err.message : "Não foi possível criar.",
                              variant: "destructive",
                            });
                          }
                        }}
                        disabled={createCategoriaMutation.isPending}
                      >
                        Criar categoria
                      </Button>
                    </div>
                  ) : null}

                  <DndContext
                    sensors={boardSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleBoardDragEnd}
                  >
                    <KanbanBoardScroller columnCount={categorias.length + 1}>
                      <SortableContext
                        items={categorias.map((c) => `column-${c.id}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className={KANBAN_COLUMN_WIDTH_CLASS}>
                        <BoardColumn
                          id="col-none"
                          title="Sem categoria"
                          count={noneBoardList.length}
                          doneCount={noneBoardDoneCount}
                          hideDone={noneBoardHideDone}
                          onToggleHideDone={() => toggleHideDone("none")}
                          colorStyle={noneBoardColor}
                          onCreateTask={canCreateTask ? () => openInlineCreateForCategory(null) : undefined}
                        >
                          {noneBoardVisible.length === 0 ? (
                            <div className="text-sm text-muted-foreground">
                              {noneBoardList.length === 0
                                ? "Arraste uma tarefa aqui."
                                : "Todas as tarefas estão concluídas e ocultas."}
                            </div>
                          ) : (
                            <SortableContext
                              items={noneBoardVisible.map((t) => `task-${t.id}`)}
                              strategy={verticalListSortingStrategy}
                            >
                              {noneBoardVisible.map((t) => (
                                <SortableTaskCard key={t.id} id={`task-${t.id}`}>
                                  <TaskRow
                                    task={t}
                                    canChangeStatus={canChangeStatusForTask(t)}
                                    onChangeStatus={(s) => handleChangeStatus(t.id, s)}
                                    onOpen={() => openDetails(t)}
                                    assigneesText={taskCardGestorMeta ? assigneeNamesFull(t) : assigneeNames(t)}
                                    variant={taskCardVariant}
                                    gestorMeta={taskCardGestorMeta}
                                    criadorLabel={criadorLabelFor(t)}
                                  />
                                </SortableTaskCard>
                              ))}
                            </SortableContext>
                          )}
                        </BoardColumn>
                        </div>

                        {categorias.map((c) => {
                          const key = String(c.id);
                          const list = groupedBoard.get(key) ?? [];
                          const columnKey = `cat-${c.id}`;
                          const hideDoneCol = isHideDone(columnKey);
                          const visibleList = filterKanbanTasksForDisplay(list, hideDoneCol);
                          const doneCountCol = countDoneKanbanTasks(list);
                          const colorStyle = resolveKanbanCategoryColor(c.cor);
                          return (
                            <SortableColumn key={c.id} id={`column-${c.id}`}>
                              {({ attributes, listeners }: any) => (
                                <BoardColumn
                                  id={`col-${c.id}`}
                                  title={c.nome}
                                  count={list.length}
                                  doneCount={doneCountCol}
                                  hideDone={hideDoneCol}
                                  onToggleHideDone={() => toggleHideDone(columnKey)}
                                  colorStyle={colorStyle}
                                  canPickColor={canManageCategories}
                                  onColorChange={
                                    canManageCategories
                                      ? async (colorId) => {
                                          try {
                                            await updateCategoriaMutation.mutateAsync({
                                              categoriaId: c.id,
                                              data: { cor: colorId },
                                            });
                                          } catch (err) {
                                            toast({
                                              title: "Erro ao alterar cor",
                                              description:
                                                err instanceof Error ? err.message : "Não foi possível salvar a cor.",
                                              variant: "destructive",
                                            });
                                          }
                                        }
                                      : undefined
                                  }
                                  onCreateTask={canCreateTask ? () => openInlineCreateForCategory(c.id) : undefined}
                                  canManage={canManageCategories}
                                  onRename={async (nextName) => {
                                    if (!canManageCategories) return;
                                    try {
                                      await updateCategoriaMutation.mutateAsync({
                                        categoriaId: c.id,
                                        data: { nome: nextName },
                                      });
                                      toast({ title: "Categoria renomeada" });
                                    } catch (err) {
                                      toast({
                                        title: "Erro ao renomear",
                                        description: err instanceof Error ? err.message : "Não foi possível renomear.",
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                  onReorderHandleProps={{
                                    ...attributes,
                                    ...listeners,
                                    onClick: (e) => e.preventDefault(),
                                  }}
                                >
                                  {visibleList.length === 0 ? (
                                    <div className="text-sm text-muted-foreground">
                                      {list.length === 0
                                        ? "Arraste uma tarefa aqui."
                                        : "Todas as tarefas estão concluídas e ocultas."}
                                    </div>
                                  ) : (
                                    <SortableContext
                                      items={visibleList.map((t) => `task-${t.id}`)}
                                      strategy={verticalListSortingStrategy}
                                    >
                                      {visibleList.map((t) => (
                                        <SortableTaskCard key={t.id} id={`task-${t.id}`}>
                                          <TaskRow
                                            task={t}
                                            canChangeStatus={canChangeStatusForTask(t)}
                                            onChangeStatus={(s) => handleChangeStatus(t.id, s)}
                                            onOpen={() => openDetails(t)}
                                            assigneesText={taskCardGestorMeta ? assigneeNamesFull(t) : assigneeNames(t)}
                                            variant={taskCardVariant}
                                            gestorMeta={taskCardGestorMeta}
                                            criadorLabel={criadorLabelFor(t)}
                                          />
                                        </SortableTaskCard>
                                      ))}
                                    </SortableContext>
                                  )}
                                </BoardColumn>
                              )}
                            </SortableColumn>
                          );
                        })}
                      </SortableContext>
                    </KanbanBoardScroller>
                  </DndContext>
                </div>
              ) : loading ? (
                <div className="text-sm text-muted-foreground">Carregando...</div>
              ) : tasks.length === 0 ? (
                <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
                  Nenhuma tarefa no departamento.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {tasks.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      canChangeStatus={canChangeStatusForTask(t)}
                      onChangeStatus={(s) => handleChangeStatus(t.id, s)}
                      onOpen={() => openDetails(t)}
                      assigneesText={taskCardGestorMeta ? assigneeNamesFull(t) : assigneeNames(t)}
                      variant={taskCardVariant}
                      gestorMeta={taskCardGestorMeta}
                      criadorLabel={criadorLabelFor(t)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ) : null}
        </Tabs>

        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="flex max-h-[90vh] w-[min(100vw-1.5rem,56rem)] max-w-none flex-col gap-4 overflow-y-auto overflow-x-hidden sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>Detalhes da tarefa</DialogTitle>
            </DialogHeader>

            {selected ? (
              <div className="min-w-0 space-y-4">
                <div className="rounded-lg border overflow-hidden">
                  <div className={`h-2 ${statusBarClass(selected.status)}`} />
                  <div className="p-3 space-y-1 bg-card">
                    {canEditBasicFields ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-muted-foreground">Título</div>
                          <div className="text-xs text-muted-foreground">
                            {basicSaving ? "Salvando..." : "Salvo"}
                          </div>
                        </div>
                        <Input
                          value={titleDraft}
                          onChange={(e) => setTitleDraft(e.target.value)}
                          className="h-9 min-w-0 w-full font-semibold"
                          onBlur={() => {
                            if (!selected) return;
                            const id = selected.id;
                            void updateMutation
                              .mutateAsync({
                                tarefaId: id,
                                data: { title: titleDraft.trim() },
                              })
                              .then((updated) => {
                                setSelected((prev) => (prev && prev.id === id ? updated : prev));
                              });
                          }}
                        />
                        <div className="text-xs text-muted-foreground">Descrição</div>
                        <Textarea
                          value={descDraft}
                          onChange={(e) => setDescDraft(e.target.value)}
                          className="min-h-[72px] max-w-full break-words"
                          placeholder="Descreva o contexto, critérios, links..."
                          onBlur={() => {
                            if (!selected) return;
                            const id = selected.id;
                            void updateMutation
                              .mutateAsync({
                                tarefaId: id,
                                data: { description: descDraft.trim() ? descDraft.trim() : null },
                              })
                              .then((updated) => {
                                setSelected((prev) => (prev && prev.id === id ? updated : prev));
                              });
                          }}
                        />
                      </div>
                    ) : (
                      <>
                        <div className="text-lg font-semibold break-words [overflow-wrap:anywhere]">{selected.title}</div>
                        {selected.description ? (
                          <div className="text-sm break-words text-muted-foreground [overflow-wrap:anywhere]">
                            {selected.description}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">Sem descrição.</div>
                        )}
                      </>
                    )}
                    <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={selected.status} />
                        <PriorityBadge priority={selected.priority} />
                      </div>
                      {canUpdateSelectedStatus ? (
                        <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                          <TaskStatusQuickActions
                            status={selected.status}
                            onChangeStatus={(s) => handleChangeStatus(selected.id, s)}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">Resumo</div>
                    <div className="text-xs text-muted-foreground">
                      {selected.categoria_id
                        ? categoriasById.get(selected.categoria_id) ?? `#${selected.categoria_id}`
                        : "Sem categoria"}
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="rounded-md border bg-muted/10 p-2">
                      <div className="text-xs text-muted-foreground">Responsáveis</div>
                      <div className="mt-1 flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1 font-medium break-words [overflow-wrap:anywhere]">
                          {assigneeNames(selected)}
                        </div>
                        {canAssign ? (
                          <Popover open={assigneeEditOpen} onOpenChange={setAssigneeEditOpen}>
                            <PopoverTrigger asChild>
                              <Button type="button" variant="outline" size="sm" className="h-7">
                                <Pencil className="h-3.5 w-3.5 mr-2" />
                                Editar
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0 w-[360px]" align="end">
                              <Command>
                                <CommandInput placeholder="Buscar usuário..." />
                                <CommandList>
                                  <CommandEmpty>Nenhum usuário.</CommandEmpty>
                                  <CommandGroup>
                                    <CommandItem
                                      value={`me ${user?.nome ?? ""}`}
                                      onSelect={() => {
                                        if (!user?.id) return;
                                        setAssigneeDraftIds((prev) =>
                                          prev.includes(user.id)
                                            ? prev.filter((x) => x !== user.id)
                                            : [...prev, user.id],
                                        );
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${user?.id && assigneeDraftIds.includes(user.id) ? "opacity-100" : "opacity-0"}`}
                                      />
                                      Eu ({user?.nome ?? "meu usuário"})
                                    </CommandItem>
                                    <CommandItem
                                      value="clear"
                                      onSelect={() => {
                                        setAssigneeDraftIds([]);
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${assigneeDraftIds.length === 0 ? "opacity-100" : "opacity-0"}`}
                                      />
                                      Sem responsáveis
                                    </CommandItem>
                                  </CommandGroup>
                                  <CommandGroup heading="Usuários">
                                    {(canAssignGlobal ? usuariosAtivos : usuariosDoDepartamento).map((u) => (
                                      <CommandItem
                                        key={u.id}
                                        value={`${u.nome} ${u.email ?? ""} ${u.id}`}
                                        onSelect={() => {
                                          setAssigneeDraftIds((prev) =>
                                            prev.includes(u.id)
                                              ? prev.filter((x) => x !== u.id)
                                              : [...prev, u.id],
                                          );
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${assigneeDraftIds.includes(u.id) ? "opacity-100" : "opacity-0"}`}
                                        />
                                        <div className="min-w-0">
                                          <div className="truncate">{u.nome}</div>
                                          {canAssignGlobal ? (
                                            <div className="text-xs text-muted-foreground truncate">
                                              {u.departamento_id
                                                ? `Depto: ${departamentosById.get(u.departamento_id)?.nome ?? `#${u.departamento_id}`}`
                                                : "Sem departamento"}
                                            </div>
                                          ) : null}
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                              <div className="border-t p-2 flex items-center justify-between gap-2">
                                <div className="text-xs text-muted-foreground truncate">
                                  {assigneeDraftIds.length
                                    ? `${assigneeDraftIds.length} selecionado(s)`
                                    : "Sem responsáveis"}
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={async () => {
                                    if (!selected) return;
                                    await handleAssign(selected.id, assigneeDraftIds);
                                    setAssigneeEditOpen(false);
                                  }}
                                >
                                  Salvar
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : null}
                      </div>
                    </div>
                    <div className="rounded-md border bg-muted/10 p-2">
                      <div className="text-xs text-muted-foreground">Prazo de entrega</div>
                      {canEditBasicFields ? (
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Input
                            type="date"
                            className="h-9 w-[min(100%,11rem)]"
                            value={dueDraft}
                            onChange={(e) => setDueDraft(e.target.value)}
                            onBlur={() => void saveDueDateIfChanged()}
                          />
                          {dueDraft ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 shrink-0"
                              onClick={() => {
                                setDueDraft("");
                                if (!selected) return;
                                const id = selected.id;
                                const cur = selected.due_date ?? "";
                                if (!cur) return;
                                void updateMutation
                                  .mutateAsync({ tarefaId: id, data: { due_date: null } })
                                  .then((updated) => {
                                    setSelected((prev) => (prev && prev.id === id ? updated : prev));
                                  })
                                  .catch((err) => {
                                    toast({
                                      title: "Erro ao limpar prazo",
                                      description: err instanceof Error ? err.message : "Não foi possível limpar.",
                                      variant: "destructive",
                                    });
                                    setDueDraft(cur);
                                  });
                              }}
                            >
                              Limpar
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        <div className="mt-1 font-medium">
                          {selected.due_date && parseDateOnlyLocal(selected.due_date)
                            ? format(parseDateOnlyLocal(selected.due_date)!, "dd/MM/yyyy")
                            : "—"}
                        </div>
                      )}
                    </div>
                    <div className="rounded-md border bg-muted/10 p-2">
                      <div className="text-xs text-muted-foreground">Criada / Atualizada</div>
                      <div className="font-medium">
                        {format(new Date(selected.created_at), "dd/MM/yyyy HH:mm")} •{" "}
                        {format(new Date(selected.updated_at), "dd/MM/yyyy HH:mm")}
                      </div>
                    </div>
                    <div className="rounded-md border bg-muted/10 p-2">
                      <div className="text-xs text-muted-foreground">Checklist</div>
                      <div className="font-medium">
                        {checklistStats.done}/{checklistStats.total} ({checklistStats.percent}%)
                      </div>
                    </div>
                    <div className="rounded-md border bg-muted/10 p-2">
                      <div className="text-xs text-muted-foreground">Anexos</div>
                      <div className="font-medium">{selected.anexos_count ?? 0}</div>
                    </div>
                  </div>
                </div>

                <Tabs value={detailsTab} onValueChange={(v) => setDetailsTab(v as any)}>
                  <TabsList className="grid grid-cols-4 w-full">
                    <TabsTrigger value="resumo">
                      <span className="inline-flex items-center gap-2">
                        <ListChecks className="h-4 w-4" /> Resumo
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="anexos">
                      <span className="inline-flex items-center gap-2">
                        <Paperclip className="h-4 w-4" /> Anexos
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="comentarios">
                      <span className="inline-flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" /> Comentários
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="historico">
                      <span className="inline-flex items-center gap-2">
                        <History className="h-4 w-4" /> Histórico
                      </span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="resumo" className="mt-4">
                    <div className="rounded-lg border bg-card p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium">Observação</div>
                        <div className="text-xs text-muted-foreground">
                          {obsSaving ? "Salvando..." : "Salvo"}
                        </div>
                      </div>
                      <Textarea
                        value={observacaoDraft}
                        onChange={(e) => setObservacaoDraft(e.target.value)}
                        placeholder="Anotações, contexto, links, decisões, pendências..."
                        className="min-h-[96px] max-w-full break-words"
                        onBlur={() => {
                          // salva imediatamente ao sair
                          void saveObservacao(observacaoDraft ?? "");
                        }}
                      />
                    </div>

                    <div className="rounded-lg border bg-card p-3 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium">Progresso</div>
                        <div className="text-xs text-muted-foreground">
                          {checklistStats.done}/{checklistStats.total} ({checklistStats.percent}%)
                        </div>
                      </div>
                      <Progress
                        value={checklistStats.percent}
                        className="h-3"
                        indicatorClassName={progressColorClass(checklistStats.percent) as any}
                      />

                      <div className="flex min-w-0 gap-2">
                        <Input
                          value={newChecklistText}
                          onChange={(e) => setNewChecklistText(e.target.value)}
                          className="min-w-0 flex-1"
                          placeholder="Adicionar item (ex.: anexar documento, validar com gestor...)"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddChecklistItem();
                            }
                          }}
                        />
                        <Button onClick={handleAddChecklistItem} disabled={createChecklistItemMutation.isPending}>
                          Adicionar
                        </Button>
                      </div>

                      <div className="max-h-64 space-y-1 overflow-y-auto overflow-x-hidden rounded-md border bg-muted/10 p-2">
                        {checklistQuery.isLoading ? (
                          <div className="text-sm text-muted-foreground">Carregando...</div>
                        ) : sortedChecklist.length === 0 ? (
                          <div className="text-sm text-muted-foreground">
                            Nenhum item ainda. Quebre a tarefa em passos pequenos para acompanhar o progresso.
                          </div>
                        ) : (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                          >
                            <SortableContext items={sortedChecklist.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                              {sortedChecklist.map((item) => (
                                <SortableChecklistRow
                                  key={item.id}
                                  item={item}
                                  onToggle={handleToggleChecklistItem}
                                  onDelete={handleDeleteChecklistItem}
                                  onEdit={handleEditChecklistItem}
                                  busy={updateChecklistItemMutation.isPending || deleteChecklistItemMutation.isPending}
                                />
                              ))}
                            </SortableContext>
                          </DndContext>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Dica: arraste pelo “⋮⋮” para reordenar.
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="historico" className="mt-4">
                    <div className="rounded-lg border bg-card p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium">Histórico</div>
                        <div className="text-xs text-muted-foreground">
                          {(atividadesQuery.data ?? []).length ? `${(atividadesQuery.data ?? []).length} eventos` : ""}
                        </div>
                      </div>
                      <div className="mt-2 max-h-[50vh] overflow-y-auto space-y-2">
                        {atividadesQuery.isLoading ? (
                          <div className="text-sm text-muted-foreground">Carregando...</div>
                        ) : (atividadesQuery.data ?? []).length === 0 ? (
                          <div className="text-sm text-muted-foreground">Sem eventos ainda.</div>
                        ) : (
                          (atividadesQuery.data ?? []).slice(0, 200).map((a) => (
                            <div key={a.id} className="flex items-start gap-2 text-sm">
                              <div className="pt-0.5">{atividadeIcon(a as any)}</div>
                              <div className="min-w-0">
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(a.criadoEm), "dd/MM/yyyy HH:mm")} •{" "}
                                  {a.usuario_id
                                    ? usuariosById.get(a.usuario_id)?.nome ?? `Usuário #${a.usuario_id}`
                                    : "Sistema"}
                                </div>
                                <div className="font-medium break-words [overflow-wrap:anywhere]">
                                  {a.tipo === "CATEGORIA_MOVIDA" ? (
                                    <>
                                      Categoria:{" "}
                                      <span className="text-muted-foreground">
                                        {a.dados?.de
                                          ? categoriasById.get(Number(a.dados.de)) ?? `#${a.dados.de}`
                                          : "Sem categoria"}
                                      </span>{" "}
                                      →{" "}
                                      <span className="text-muted-foreground">
                                        {a.dados?.para
                                          ? categoriasById.get(Number(a.dados.para)) ?? `#${a.dados.para}`
                                          : "Sem categoria"}
                                      </span>
                                    </>
                                  ) : (
                                    atividadeLabel(a as any)
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="anexos" className="mt-4">
                    <div className="rounded-lg border bg-card p-3 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium">Arquivos</div>
                        <div className="text-xs text-muted-foreground">
                          {uploadingNames.length ? `Enviando ${uploadingNames.length}...` : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          ref={anexoFileInputRef}
                          type="file"
                          className="sr-only"
                          multiple
                          onChange={(e) => {
                            void handleUploadFiles(e.target.files);
                            e.target.value = "";
                          }}
                          disabled={uploadAnexoMutation.isPending}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={uploadAnexoMutation.isPending}
                          onClick={() => anexoFileInputRef.current?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Enviar arquivo
                        </Button>
                        <div className="text-xs text-muted-foreground">
                          Imagens e documentos ficam salvos na tarefa.
                        </div>
                      </div>

                      <div className="rounded-md border bg-muted/10 p-2 max-h-64 overflow-y-auto space-y-2">
                        {anexosQuery.isLoading ? (
                          <div className="text-sm text-muted-foreground">Carregando...</div>
                        ) : (anexosQuery.data ?? []).length === 0 ? (
                          <div className="text-sm text-muted-foreground">Nenhum anexo.</div>
                        ) : (
                          (anexosQuery.data ?? []).map((a) => {
                            const isImage =
                              (a.mime_type ?? "").startsWith("image/") ||
                              /\.(png|jpe?g|gif|webp)$/i.test(a.filename);
                            const fileUrl = apiAssetUrl(a.path);
                            return (
                              <div key={a.id} className="flex items-start justify-between gap-2 rounded border bg-background p-2">
                                <div className="min-w-0">
                                  <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm font-medium hover:underline break-words"
                                  >
                                    {a.filename}
                                  </a>
                                  <div className="text-xs text-muted-foreground">
                                    {format(new Date(a.criadoEm), "dd/MM/yyyy HH:mm")}
                                  </div>
                                  {isImage ? (
                                    <a href={fileUrl} target="_blank" rel="noreferrer">
                                      <img
                                        src={fileUrl}
                                        alt={a.filename}
                                        className="mt-2 max-h-40 rounded border object-contain bg-muted/20"
                                      />
                                    </a>
                                  ) : null}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteAnexo(a)}
                                  disabled={deleteAnexoMutation.isPending}
                                  title="Remover anexo"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="comentarios" className="mt-4">
                    <div className="space-y-2">
                      <div className="rounded-md border bg-muted/20 p-3 max-h-64 overflow-y-auto space-y-2">
                        {comentariosQuery.isLoading ? (
                          <div className="text-sm text-muted-foreground">Carregando...</div>
                        ) : (comentariosQuery.data ?? []).length === 0 ? (
                          <div className="text-sm text-muted-foreground">Nenhum comentário ainda.</div>
                        ) : (
                          (comentariosQuery.data ?? []).map((c) => (
                            <div key={c.id} className="rounded border bg-background p-2">
                              <div className="text-xs text-muted-foreground">
                                {usuariosById.get(c.usuario_id)?.nome ?? `Usuário #${c.usuario_id}`} •{" "}
                                {format(new Date(c.criadoEm), "dd/MM/yyyy HH:mm")}
                              </div>
                              <div className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">
                                {c.conteudo}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="flex min-w-0 gap-2">
                        <Input
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          className="min-w-0 flex-1"
                          placeholder="Escreva um comentário..."
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                              e.preventDefault();
                              handleSendComment();
                            }
                          }}
                        />
                        <Button onClick={handleSendComment} disabled={createComentarioMutation.isPending}>
                          Enviar
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground">Dica: envie com Ctrl+Enter.</div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Selecione uma tarefa.</div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppPage>
  );
}

