import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ROTULO_PRIORIDADE,
  ROTULO_STATUS,
  type TarefaPrioridade,
  type TarefaStatus,
} from "@/lib/tarefas";

export function StatusBadge({ status }: { status: TarefaStatus }) {
  return <Badge variant={status === "DONE" ? "default" : status === "BLOCKED" ? "destructive" : "secondary"}>{ROTULO_STATUS[status]}</Badge>;
}

export function PrioridadeBadge({ prioridade }: { prioridade: TarefaPrioridade }) {
  return <Badge variant={prioridade === "URGENTE" ? "destructive" : "outline"}>{ROTULO_PRIORIDADE[prioridade]}</Badge>;
}

export function BarraProgresso({ percentual, className }: { percentual: number; className?: string }) {
  const cor = percentual >= 100 ? "bg-emerald-500" : percentual >= 60 ? "bg-sky-500" : percentual >= 30 ? "bg-amber-400" : "bg-rose-500";
  return (
    <div
      role="progressbar"
      aria-valuenow={percentual}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div className={cn("h-full transition-all", cor)} style={{ width: `${percentual}%` }} />
    </div>
  );
}

/** "2026-11-05" → "05/11/2026", sem passar por Date (que deslocaria o dia pelo fuso). */
export function formatarPrazo(prazo: string | null) {
  if (!prazo) return "Sem prazo";
  const [y, m, d] = prazo.split("-");
  return `${d}/${m}/${y}`;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 md:text-sm dark:bg-input/30",
        className,
      )}
      {...props}
    />
  );
}

/** Caixas de marcar para escolher responsáveis; vai dentro de um <form> (campo "responsaveis"). */
export function EscolherResponsaveis({
  pessoas,
  marcadas,
  onChange,
}: {
  pessoas: { id: string; nome: string }[];
  marcadas: string[];
  onChange: (ids: string[]) => void;
}) {
  if (!pessoas.length) return <p className="text-sm text-muted-foreground">Nenhuma pessoa cadastrada.</p>;
  return (
    <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border p-2">
      {pessoas.map((p) => (
        <label key={p.id} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={marcadas.includes(p.id)}
            onChange={(e) => onChange(e.target.checked ? [...marcadas, p.id] : marcadas.filter((x) => x !== p.id))}
          />
          {p.nome}
        </label>
      ))}
    </div>
  );
}
