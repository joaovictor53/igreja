import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, BarChart3, Building2, ListTodo, Sparkles, Trophy, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useDepartamentos } from "@/hooks/use-departamentos";
import {
  useTarefasIndicadoresDepartamento,
  useTarefasIndicadoresMinhas,
} from "@/hooks/use-tarefas";
import type { TarefasIndicadores, TarefasIndicadoresUsuario } from "@/lib/api";
import { cn } from "@/lib/utils";

function tarefasFilterHref(escopo: "minhas" | "departamento", extra: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  sp.set("tab", escopo);
  for (const [k, v] of Object.entries(extra)) {
    if (v != null && v !== "") sp.set(k, v);
  }
  return `/tarefas?${sp.toString()}`;
}

function ResumoCards({ data, escopo }: { data: TarefasIndicadores; escopo: "minhas" | "departamento" }) {
  const maxBar = Math.max(1, data.total);
  const items = [
    {
      label: "Total no recorte",
      value: data.total,
      className: "border-primary/20 bg-primary/5",
      href: tarefasFilterHref(escopo, {}),
    },
    {
      label: "A fazer",
      value: data.todo,
      className: "border-slate-400/25 bg-slate-500/5",
      href: tarefasFilterHref(escopo, { status: "TODO" }),
    },
    {
      label: "Em andamento",
      value: data.in_progress,
      className: "border-amber-500/25 bg-amber-500/8",
      href: tarefasFilterHref(escopo, { status: "IN_PROGRESS" }),
    },
    {
      label: "Bloqueadas",
      value: data.blocked,
      className: "border-rose-500/25 bg-rose-500/8",
      href: tarefasFilterHref(escopo, { status: "BLOCKED" }),
    },
    {
      label: "Concluídas",
      value: data.done,
      className: "border-emerald-500/25 bg-emerald-500/8",
      href: tarefasFilterHref(escopo, { status: "DONE" }),
    },
    {
      label: "Atrasadas (abertas)",
      value: data.atrasadas,
      className: "border-red-500/25 bg-red-500/8",
      href: tarefasFilterHref(escopo, { atrasadas: "1" }),
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((it) => (
        <Link
          key={it.label}
          to={it.href}
          className={cn(
            "block rounded-2xl border p-4 text-left shadow-sm transition",
            "bg-gradient-to-br from-card to-muted/20",
            "hover:border-primary/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            it.className,
          )}
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{it.label}</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">{it.value}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/70"
              style={{ width: `${Math.min(100, Math.round((it.value / maxBar) * 100))}%` }}
            />
          </div>
        </Link>
      ))}
    </div>
  );
}

function RankingTable({
  title,
  subtitle,
  icon: Icon,
  rows,
  highlight,
  escopo,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  rows: TarefasIndicadoresUsuario[];
  highlight: "abertas" | "atrasadas" | "concluidas";
  escopo: "minhas" | "departamento";
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-start gap-2">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </span>
        <div>
          <h3 className="text-sm font-semibold leading-tight">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum dado neste critério.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r, i) => (
            <li key={r.usuario_id}>
              <Link
                to={tarefasFilterHref(escopo, { responsavel: String(r.usuario_id) })}
                className="grid w-full grid-cols-[auto_1fr] gap-x-2 gap-y-1 rounded-lg border border-border/40 bg-background/60 px-3 py-2.5 text-left text-sm transition hover:border-primary/35 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="row-start-1 shrink-0 pt-0.5 tabular-nums text-xs font-semibold text-muted-foreground">
                  {i + 1}.
                </span>
                <span className="row-start-1 block min-w-0 font-medium leading-snug [overflow-wrap:anywhere]">
                  {r.nome}
                </span>
                <div className="col-span-2 row-start-2 flex min-w-0 flex-wrap gap-x-2 gap-y-0.5 text-xs tabular-nums sm:col-span-1 sm:col-start-2">
                  <span className={highlight === "abertas" ? "font-bold text-foreground" : "text-muted-foreground"}>
                    {r.abertas} abertas
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span
                    className={
                      highlight === "atrasadas" ? "font-bold text-rose-600 dark:text-rose-400" : "text-muted-foreground"
                    }
                  >
                    {r.atrasadas} atras.
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span
                    className={
                      highlight === "concluidas"
                        ? "font-bold text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground"
                    }
                  >
                    {r.concluidas} ok
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Painel({
  data,
  isLoading,
  escopo,
}: {
  data?: TarefasIndicadores;
  isLoading: boolean;
  escopo: "minhas" | "departamento";
}) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando indicadores…</p>;
  }
  if (!data) {
    return <p className="text-sm text-muted-foreground">Não foi possível carregar os indicadores.</p>;
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <ListTodo className="h-3.5 w-3.5" />
          Visão geral por status
        </h2>
        <p className="text-xs text-muted-foreground">
          Clique em um card para abrir a lista de tarefas com o filtro correspondente (aba e critérios na URL).
        </p>
        <ResumoCards data={data} escopo={escopo} />
      </section>

      <Separator className="bg-border/60" />

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          Responsáveis — ranking (até 8)
        </h2>
        <p className="text-xs text-muted-foreground">
          Contagem por usuário listado como responsável (inclui múltiplos responsáveis). Tarefas sem responsável não
          entram no ranking. Clique em uma linha para filtrar pela pessoa.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <RankingTable
            title="Mais demandas abertas"
            subtitle="Ordenado por tarefas não concluídas"
            icon={Users}
            rows={data.top_abertas}
            highlight="abertas"
            escopo={escopo}
          />
          <RankingTable
            title="Mais atrasadas (como responsável)"
            subtitle="Abertas com prazo vencido"
            icon={BarChart3}
            rows={data.top_atrasadas}
            highlight="atrasadas"
            escopo={escopo}
          />
          <RankingTable
            title="Mais concluídas"
            subtitle="Histórico no recorte atual"
            icon={Trophy}
            rows={data.top_concluidas}
            highlight="concluidas"
            escopo={escopo}
          />
        </div>
      </section>
    </div>
  );
}

export default function TarefasIndicadores() {
  const { user, hasPermission } = useAuth();
  const canViewDept = hasPermission("tarefas.ver_departamento");
  const departmentId = user?.departamento_id ?? null;

  const [aba, setAba] = useState<"minhas" | "departamento">("minhas");

  const depsQuery = useDepartamentos();
  const deptNome = useMemo(() => {
    if (!departmentId || !depsQuery.data) return null;
    return depsQuery.data.find((d) => d.id === departmentId)?.nome ?? null;
  }, [departmentId, depsQuery.data]);

  const minhasQuery = useTarefasIndicadoresMinhas();
  const deptIndQuery = useTarefasIndicadoresDepartamento(departmentId ?? 0, {
    enabled: Boolean(canViewDept && departmentId && aba === "departamento"),
  });

  const mostrarAbas = Boolean(canViewDept && departmentId);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-3 pb-12 pt-2 sm:px-4">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2 h-8 text-muted-foreground hover:text-foreground">
          <Link to="/tarefas" className="inline-flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Voltar às tarefas
          </Link>
        </Button>
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/15 text-sky-700 dark:text-sky-400">
            <BarChart3 className="h-5 w-5" />
          </span>
          Indicadores de tarefas
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          Resumo por status, tarefas atrasadas e ranking de responsáveis — no mesmo universo da listagem (minhas ou
          triagem do departamento).
        </p>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-sky-500/10 via-indigo-500/6 to-transparent p-5 shadow-sm sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-12 h-40 w-40 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="relative space-y-1">
          <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-widest">Painel</span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Os números são calculados no servidor a partir das tarefas visíveis para o recorte escolhido (não aplicam
            filtros de busca da lista). Use os cards e o ranking para ir à lista já filtrada.
          </p>
        </div>
      </div>

      {mostrarAbas ? (
        <Tabs value={aba} onValueChange={(v) => setAba(v as "minhas" | "departamento")} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="minhas">Minhas</TabsTrigger>
            <TabsTrigger value="departamento" className="gap-1.5">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              Departamento
            </TabsTrigger>
          </TabsList>
          <TabsContent value="minhas" className="mt-6">
            <Painel data={minhasQuery.data} isLoading={minhasQuery.isLoading} escopo="minhas" />
          </TabsContent>
          <TabsContent value="departamento" className="mt-6">
            <p className="mb-4 text-sm text-muted-foreground">
              {deptNome ? (
                <>
                  Departamento: <span className="font-medium text-foreground">{deptNome}</span>
                </>
              ) : (
                "Todas as tarefas ativas do seu departamento (visão de triagem)."
              )}
            </p>
            <Painel data={deptIndQuery.data} isLoading={deptIndQuery.isLoading} escopo="departamento" />
          </TabsContent>
        </Tabs>
      ) : (
        <Painel data={minhasQuery.data} isLoading={minhasQuery.isLoading} escopo="minhas" />
      )}
    </div>
  );
}
