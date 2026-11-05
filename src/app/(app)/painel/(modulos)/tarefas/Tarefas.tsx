"use client";

import { useMemo, useState } from "react";
import { LayoutListIcon, KanbanIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "@/lib/use-local-storage";
import { tarefaAtrasada } from "@/lib/secretaria";
import {
  ROTULO_STATUS,
  TAREFA_STATUS,
  type CategoriaView,
  type TarefaStatus,
  type TarefaView,
} from "@/lib/tarefas";
import { criarCategoria, moverTarefa, mudarStatus } from "@/server/modules/tarefas/actions";
import { Detalhes } from "./Detalhes";
import { NovaTarefa } from "./NovaTarefa";
import { CartaoTarefa, Quadro, type Coluna } from "./Quadro";

const SEM_CATEGORIA = "sem-categoria";
const COR_STATUS: Record<TarefaStatus, string> = { TODO: "slate", IN_PROGRESS: "amber", BLOCKED: "rose", DONE: "green" };

type Visao = "quadro" | "lista";
type Aba = "minhas" | "todas";

export function Tarefas({
  tarefas: doServidor,
  categorias,
  pessoas,
  pessoaId,
  usuarioId,
  gerir,
  hoje,
}: {
  tarefas: TarefaView[];
  categorias: CategoriaView[];
  pessoas: { id: string; nome: string }[];
  pessoaId: string | null;
  usuarioId: string;
  gerir: boolean;
  hoje: string;
}) {
  // Cópia local só para o arrastar parecer imediato; a verdade vem do servidor a cada revalidação.
  const [tarefas, setTarefas] = useState(doServidor);
  const [versaoServidor, setVersaoServidor] = useState(doServidor);
  if (versaoServidor !== doServidor) {
    setVersaoServidor(doServidor);
    setTarefas(doServidor);
  }

  const [aba, setAba] = useState<Aba>(gerir ? "todas" : "minhas");
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<TarefaStatus | "">("");
  const [soAtrasadas, setSoAtrasadas] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);
  const [nova, setNova] = useState<{ aberta: boolean; categoriaId: string | null }>({ aberta: false, categoriaId: null });
  const [novaCategoria, setNovaCategoria] = useState("");

  // Preferência por navegador; sem valor salvo (ou no servidor) o quadro é o padrão.
  const [visaoSalva, salvarVisao] = useLocalStorage(`tarefas:visao:${usuarioId}`);
  const visao: Visao = visaoSalva === "lista" ? "lista" : "quadro";
  const escolherVisao = (v: Visao) => salvarVisao(v);

  const sou = (t: TarefaView) => t.criadoPorMim || (!!pessoaId && t.responsaveis.some((r) => r.id === pessoaId));

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return tarefas.filter((t) => {
      if (aba === "minhas" && !sou(t)) return false;
      if (status && t.status !== status) return false;
      if (soAtrasadas && !tarefaAtrasada(t.prazo, t.status === "DONE", hoje)) return false;
      if (!termo) return true;
      return [t.titulo, t.descricao ?? "", ...t.responsaveis.map((r) => r.nome)].some((s) => s.toLowerCase().includes(termo));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tarefas, aba, status, soAtrasadas, busca, hoje, pessoaId]);

  // "Minhas" organiza por status; "Todas" organiza pelas categorias que a paróquia criou.
  const colunas: Coluna[] = useMemo(() => {
    if (aba === "minhas") return TAREFA_STATUS.map((s) => ({ id: s, titulo: ROTULO_STATUS[s], cor: COR_STATUS[s] }));
    return [
      { id: SEM_CATEGORIA, titulo: "Sem categoria" },
      ...categorias.map((c) => ({ id: c.id, titulo: c.nome, cor: c.cor, categoriaId: c.id })),
    ];
  }, [aba, categorias]);

  const porColuna = useMemo(() => {
    const m: Record<string, TarefaView[]> = Object.fromEntries(colunas.map((c) => [c.id, []]));
    for (const t of filtradas) {
      const chave = aba === "minhas" ? t.status : (t.categoriaId ?? SEM_CATEGORIA);
      (m[chave] ??= []).push(t);
    }
    return m;
  }, [filtradas, colunas, aba]);

  async function mover(tarefaId: string, colunaId: string) {
    const t = tarefas.find((x) => x.id === tarefaId);
    if (!t) return;
    setErro(null);
    if (aba === "minhas") {
      if (t.status === colunaId) return;
      const novoStatus = colunaId as TarefaStatus;
      setTarefas((l) => l.map((x) => (x.id === tarefaId ? { ...x, status: novoStatus } : x)));
      const r = await mudarStatus(tarefaId, novoStatus);
      if (r.erro) { setErro(r.erro); setTarefas(doServidor); }
    } else {
      const categoriaId = colunaId === SEM_CATEGORIA ? null : colunaId;
      if (t.categoriaId === categoriaId) return;
      setTarefas((l) => l.map((x) => (x.id === tarefaId ? { ...x, categoriaId } : x)));
      const r = await moverTarefa(tarefaId, categoriaId);
      if (r.erro) { setErro(r.erro); setTarefas(doServidor); }
    }
  }

  async function adicionarCategoria(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const r = await criarCategoria({ nome: novaCategoria });
    if (r.erro) setErro(r.erro);
    else setNovaCategoria("");
  }

  const selecionada = tarefas.find((t) => t.id === aberta) ?? null;
  const abrirNova = (colunaId?: string) =>
    setNova({ aberta: true, categoriaId: aba === "todas" && colunaId && colunaId !== SEM_CATEGORIA ? colunaId : null });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {gerir && (
          <div role="tablist" className="flex rounded-lg border p-0.5">
            {([["todas", "Todas"], ["minhas", "Minhas"]] as const).map(([id, rotulo]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={aba === id}
                onClick={() => setAba(id)}
                className={cn("rounded-md px-3 py-1 text-sm", aba === id ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
              >
                {rotulo}
              </button>
            ))}
          </div>
        )}
        <div className="flex rounded-lg border p-0.5">
          <Button type="button" size="sm" variant={visao === "quadro" ? "default" : "ghost"} onClick={() => escolherVisao("quadro")} aria-pressed={visao === "quadro"}>
            <KanbanIcon /> Quadro
          </Button>
          <Button type="button" size="sm" variant={visao === "lista" ? "default" : "ghost"} onClick={() => escolherVisao("lista")} aria-pressed={visao === "lista"}>
            <LayoutListIcon /> Lista
          </Button>
        </div>
        <Button type="button" className="ml-auto" onClick={() => abrirNova()}><PlusIcon /> Nova tarefa</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por título ou responsável" aria-label="Buscar tarefas" className="max-w-xs" />
        <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as TarefaStatus | "")} aria-label="Filtrar por status">
          <NativeSelectOption value="">Todos os status</NativeSelectOption>
          {TAREFA_STATUS.map((s) => <NativeSelectOption key={s} value={s}>{ROTULO_STATUS[s]}</NativeSelectOption>)}
        </NativeSelect>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-primary" checked={soAtrasadas} onChange={(e) => setSoAtrasadas(e.target.checked)} />
          Só atrasadas
        </label>
      </div>

      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}

      {visao === "quadro" ? (
        <Quadro
          colunas={colunas}
          tarefasPorColuna={porColuna}
          hoje={hoje}
          usuarioId={usuarioId}
          arrastavel={aba === "minhas" || gerir}
          podeEditarColunas={gerir && aba === "todas"}
          podeCriar
          onMover={mover}
          onAbrir={(t) => setAberta(t.id)}
          onNova={abrirNova}
          onErro={setErro}
        />
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {filtradas.map((t) => <CartaoTarefa key={t.id} t={t} hoje={hoje} onAbrir={(x) => setAberta(x.id)} />)}
          {!filtradas.length && <p className="text-sm text-muted-foreground">Nenhuma tarefa encontrada.</p>}
        </div>
      )}

      {gerir && aba === "todas" && (
        <form onSubmit={adicionarCategoria} className="flex max-w-sm gap-2">
          <Input value={novaCategoria} onChange={(e) => setNovaCategoria(e.target.value)} placeholder="Nova categoria (coluna)" maxLength={60} aria-label="Nome da nova categoria" />
          <Button type="submit" variant="outline" disabled={!novaCategoria.trim()}>Criar categoria</Button>
        </form>
      )}

      <Detalhes tarefa={selecionada} categorias={categorias} pessoas={pessoas} gerir={gerir} onFechar={() => setAberta(null)} />
      <NovaTarefa
        aberta={nova.aberta}
        categoriaInicial={nova.categoriaId}
        categorias={categorias}
        pessoas={pessoas}
        gerir={gerir}
        onFechar={() => setNova((n) => ({ ...n, aberta: false }))}
      />
    </div>
  );
}
