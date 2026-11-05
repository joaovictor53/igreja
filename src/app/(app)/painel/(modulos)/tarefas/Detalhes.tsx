"use client";

import { useEffect, useState } from "react";
import { PlayCircleIcon, CheckCircle2Icon, BanIcon, RotateCcwIcon, TrashIcon } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import {
  ROTULO_PRIORIDADE,
  TAREFA_PRIORIDADES,
  progressoChecklist,
  rotuloAtividade,
  type CategoriaView,
  type TarefaPrioridade,
  type TarefaStatus,
  type TarefaView,
} from "@/lib/tarefas";
import {
  adicionarItem,
  alternarItem,
  atribuirTarefa,
  atualizarTarefa,
  comentar,
  detalhesDaTarefa,
  editarItem,
  excluirTarefa,
  moverTarefa,
  mudarStatus,
  removerItem,
  type DetalhesTarefa,
  type TarefaResultado,
} from "@/server/modules/tarefas/actions";
import { BarraProgresso, EscolherResponsaveis, PrioridadeBadge, StatusBadge, Textarea, formatarPrazo } from "./ui";

type Aba = "resumo" | "comentarios" | "historico";

const ACOES_STATUS: { valor: TarefaStatus; rotulo: string; Icone: typeof PlayCircleIcon }[] = [
  { valor: "IN_PROGRESS", rotulo: "Em andamento", Icone: PlayCircleIcon },
  { valor: "BLOCKED", rotulo: "Bloquear", Icone: BanIcon },
  { valor: "DONE", rotulo: "Concluir", Icone: CheckCircle2Icon },
  { valor: "TODO", rotulo: "Reabrir", Icone: RotateCcwIcon },
];

const dataHora = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function Detalhes({
  tarefa,
  categorias,
  pessoas,
  gerir,
  onFechar,
}: {
  tarefa: TarefaView | null;
  categorias: CategoriaView[];
  pessoas: { id: string; nome: string }[];
  gerir: boolean;
  onFechar: () => void;
}) {
  return (
    <Sheet open={!!tarefa} onOpenChange={(aberto) => !aberto && onFechar()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {tarefa && <Corpo key={tarefa.id} tarefa={tarefa} categorias={categorias} pessoas={pessoas} gerir={gerir} onExcluida={onFechar} />}
      </SheetContent>
    </Sheet>
  );
}

function Corpo({
  tarefa,
  categorias,
  pessoas,
  gerir,
  onExcluida,
}: {
  tarefa: TarefaView;
  categorias: CategoriaView[];
  pessoas: { id: string; nome: string }[];
  gerir: boolean;
  onExcluida: () => void;
}) {
  const [aba, setAba] = useState<Aba>("resumo");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  // Roda uma action e mostra o erro, se houver; o servidor revalida a página e a tarefa chega atualizada.
  async function executar(acao: () => Promise<TarefaResultado>) {
    setOcupado(true);
    setErro(null);
    const r = await acao();
    setOcupado(false);
    if (r.erro) setErro(r.erro);
    return !r.erro;
  }

  return (
    <>
      <SheetHeader className="pr-12">
        <SheetTitle className="break-words">{tarefa.titulo}</SheetTitle>
        <SheetDescription className="flex flex-wrap items-center gap-2">
          <StatusBadge status={tarefa.status} />
          <PrioridadeBadge prioridade={tarefa.prioridade} />
          <span>Criada por {tarefa.criadoPor}</span>
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-1 flex-col gap-4 px-4 pb-4">
        <div role="tablist" className="flex gap-1 border-b">
          {([["resumo", "Resumo"], ["comentarios", "Comentários"], ["historico", "Histórico"]] as const).map(([id, rotulo]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={aba === id}
              onClick={() => setAba(id)}
              className={cn("-mb-px border-b-2 px-3 py-1.5 text-sm", aba === id ? "border-primary font-medium" : "border-transparent text-muted-foreground")}
            >
              {rotulo}
            </button>
          ))}
        </div>
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
        {aba === "resumo" && <Resumo tarefa={tarefa} categorias={categorias} pessoas={pessoas} gerir={gerir} ocupado={ocupado} executar={executar} onExcluida={onExcluida} />}
        {aba === "comentarios" && <Comentarios tarefa={tarefa} />}
        {aba === "historico" && <Historico tarefa={tarefa} />}
      </div>
    </>
  );
}

function Resumo({
  tarefa,
  categorias,
  pessoas,
  gerir,
  ocupado,
  executar,
  onExcluida,
}: {
  tarefa: TarefaView;
  categorias: CategoriaView[];
  pessoas: { id: string; nome: string }[];
  gerir: boolean;
  ocupado: boolean;
  executar: (acao: () => Promise<TarefaResultado>) => Promise<boolean>;
  onExcluida: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [titulo, setTitulo] = useState(tarefa.titulo);
  const [descricao, setDescricao] = useState(tarefa.descricao ?? "");
  const [observacao, setObservacao] = useState(tarefa.observacao ?? "");
  const [prioridade, setPrioridade] = useState<TarefaPrioridade>(tarefa.prioridade);
  const [prazo, setPrazo] = useState(tarefa.prazo ?? "");
  const [responsaveis, setResponsaveis] = useState(tarefa.responsaveis.map((r) => r.id));
  const [editandoResp, setEditandoResp] = useState(false);
  const [novoItem, setNovoItem] = useState("");
  const [itemEmEdicao, setItemEmEdicao] = useState<{ id: string; texto: string } | null>(null);
  // Marcação imediata do checklist; o valor do servidor volta com a revalidação e substitui este.
  const [otimista, setOtimista] = useState<Record<string, boolean>>({});
  const itens = tarefa.checklist.map((i) => ({ ...i, concluido: otimista[i.id] ?? i.concluido }));

  async function marcar(itemId: string, concluido: boolean) {
    setOtimista((o) => ({ ...o, [itemId]: concluido }));
    await executar(() => alternarItem(itemId, concluido));
    setOtimista((o) => Object.fromEntries(Object.entries(o).filter(([id]) => id !== itemId)));
  }

  async function salvarEdicao(e: React.FormEvent) {
    e.preventDefault();
    const ok = await executar(() => atualizarTarefa({ id: tarefa.id, titulo, descricao, observacao, prioridade, prazo }));
    if (ok) setEditando(false);
  }
  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!novoItem.trim()) return;
    if (await executar(() => adicionarItem(tarefa.id, novoItem))) setNovoItem("");
  }
  async function salvarItem(e: React.FormEvent) {
    e.preventDefault();
    if (!itemEmEdicao) return;
    if (await executar(() => editarItem(itemEmEdicao.id, itemEmEdicao.texto))) setItemEmEdicao(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {ACOES_STATUS.filter((a) => a.valor !== tarefa.status && (tarefa.status === "DONE" ? a.valor === "TODO" : a.valor !== "TODO")).map(({ valor, rotulo, Icone }) => (
          <Button key={valor} type="button" size="sm" variant={valor === "DONE" ? "default" : "outline"} disabled={ocupado} onClick={() => executar(() => mudarStatus(tarefa.id, valor))}>
            <Icone /> {rotulo}
          </Button>
        ))}
      </div>

      {gerir && (
        <Label className="flex-col items-stretch">
          Categoria
          <NativeSelect
            value={tarefa.categoriaId ?? ""}
            disabled={ocupado}
            onChange={(e) => executar(() => moverTarefa(tarefa.id, e.target.value || null))}
            className="w-full"
          >
            <NativeSelectOption value="">Sem categoria</NativeSelectOption>
            {categorias.map((c) => <NativeSelectOption key={c.id} value={c.id}>{c.nome}</NativeSelectOption>)}
          </NativeSelect>
        </Label>
      )}

      {editando ? (
        <form onSubmit={salvarEdicao} className="flex flex-col gap-3">
          <Label className="flex-col items-stretch">Título<Input value={titulo} onChange={(e) => setTitulo(e.target.value)} required minLength={2} maxLength={200} /></Label>
          <Label className="flex-col items-stretch">Descrição<Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={5000} /></Label>
          <Label className="flex-col items-stretch">Observação<Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} maxLength={5000} /></Label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Label className="flex-col items-stretch">
              Prioridade
              <NativeSelect value={prioridade} onChange={(e) => setPrioridade(e.target.value as TarefaPrioridade)} className="w-full">
                {TAREFA_PRIORIDADES.map((p) => <NativeSelectOption key={p} value={p}>{ROTULO_PRIORIDADE[p]}</NativeSelectOption>)}
              </NativeSelect>
            </Label>
            <Label className="flex-col items-stretch">Prazo<Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} /></Label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={ocupado}>Salvar</Button>
            <Button type="button" variant="outline" onClick={() => setEditando(false)}>Cancelar</Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Prazo</dt><dd>{formatarPrazo(tarefa.prazo)}</dd>
            <dt className="text-muted-foreground">Responsáveis</dt>
            <dd>{tarefa.responsaveis.length ? tarefa.responsaveis.map((r) => r.nome).join(", ") : "—"}</dd>
          </dl>
          {tarefa.descricao && <p className="text-sm whitespace-pre-wrap">{tarefa.descricao}</p>}
          {tarefa.observacao && (
            <div className="rounded-lg border bg-muted/40 p-2 text-sm">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Observação</p>
              <p className="whitespace-pre-wrap">{tarefa.observacao}</p>
            </div>
          )}
          {gerir && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setTitulo(tarefa.titulo); setDescricao(tarefa.descricao ?? ""); setObservacao(tarefa.observacao ?? "");
                  setPrioridade(tarefa.prioridade); setPrazo(tarefa.prazo ?? ""); setEditando(true);
                }}
              >
                Editar
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => { setResponsaveis(tarefa.responsaveis.map((r) => r.id)); setEditandoResp((v) => !v); }}>Responsáveis</Button>
            </div>
          )}
        </div>
      )}

      {gerir && editandoResp && (
        <div className="flex flex-col gap-2">
          <EscolherResponsaveis pessoas={pessoas} marcadas={responsaveis} onChange={setResponsaveis} />
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={ocupado} onClick={async () => { if (await executar(() => atribuirTarefa(tarefa.id, responsaveis))) setEditandoResp(false); }}>Salvar responsáveis</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setEditandoResp(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      <section aria-label="Checklist" className="flex flex-col gap-2">
        <h4 className="font-medium">Checklist</h4>
        {itens.length > 0 && <BarraProgresso percentual={progressoChecklist(itens)} />}
        <ul className="flex flex-col gap-1">
          {itens.map((i) => (
            <li key={i.id} className="flex items-center gap-2">
              {itemEmEdicao?.id === i.id ? (
                <form onSubmit={salvarItem} className="flex flex-1 gap-2">
                  <Input value={itemEmEdicao.texto} onChange={(e) => setItemEmEdicao({ id: i.id, texto: e.target.value })} maxLength={300} required aria-label="Texto do item" />
                  <Button type="submit" size="sm" disabled={ocupado}>Salvar</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setItemEmEdicao(null)}>Cancelar</Button>
                </form>
              ) : (
                <>
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={i.concluido}
                    onChange={(e) => marcar(i.id, e.target.checked)}
                    aria-label={i.conteudo}
                  />
                  <button type="button" className={cn("flex-1 text-left text-sm break-words", i.concluido && "text-muted-foreground line-through")} onClick={() => setItemEmEdicao({ id: i.id, texto: i.conteudo })}>
                    {i.conteudo}
                  </button>
                  <Button type="button" variant="ghost" size="icon-xs" disabled={ocupado} onClick={() => executar(() => removerItem(i.id))} aria-label={`Remover ${i.conteudo}`}>
                    <TrashIcon />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
        <form onSubmit={adicionar} className="flex gap-2">
          <Input value={novoItem} onChange={(e) => setNovoItem(e.target.value)} placeholder="Novo item" maxLength={300} aria-label="Novo item do checklist" />
          <Button type="submit" variant="outline" disabled={ocupado || !novoItem.trim()}>Adicionar</Button>
        </form>
      </section>

      {gerir && (
        <Button
          type="button"
          variant="destructive"
          className="self-start"
          disabled={ocupado}
          onClick={async () => {
            if (!window.confirm(`Excluir a tarefa "${tarefa.titulo}"? Isso não pode ser desfeito.`)) return;
            if (await executar(() => excluirTarefa(tarefa.id))) onExcluida();
          }}
        >
          Excluir tarefa
        </Button>
      )}
    </div>
  );
}

/** Comentários e histórico não vêm com a página: são buscados quando a aba abre e de novo quando a tarefa muda. */
function useDetalhes(tarefa: TarefaView) {
  const [dados, setDados] = useState<DetalhesTarefa | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);
  const assinatura = `${tarefa.status}|${tarefa.categoriaId}|${tarefa.observacao}|${tarefa.responsaveis.length}|${tarefa.checklist.map((i) => +i.concluido).join("")}`;

  useEffect(() => {
    let atual = true;
    detalhesDaTarefa(tarefa.id).then((r) => {
      if (!atual) return;
      if ("erro" in r) setErro(r.erro);
      else { setDados(r); setErro(null); }
    });
    return () => { atual = false; };
  }, [tarefa.id, assinatura, versao]);

  return { dados, erro, recarregar: () => setVersao((v) => v + 1) };
}

function Comentarios({ tarefa }: { tarefa: TarefaView }) {
  const { dados, erro, recarregar } = useDetalhes(tarefa);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    const r = await comentar(tarefa.id, texto);
    setEnviando(false);
    if (r.erro) return setErroEnvio(r.erro);
    setErroEnvio(null);
    setTexto("");
    recarregar();
  }

  return (
    <div className="flex flex-col gap-3">
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      {!dados && !erro && <p className="text-sm text-muted-foreground">Carregando…</p>}
      <ul className="flex flex-col gap-3">
        {dados?.comentarios.map((c) => (
          <li key={c.id} className="rounded-lg border p-2 text-sm">
            <p className="mb-1 text-xs text-muted-foreground">{c.autor} · {dataHora(c.em)}</p>
            <p className="whitespace-pre-wrap">{c.texto}</p>
          </li>
        ))}
        {dados && !dados.comentarios.length && <li className="text-sm text-muted-foreground">Nenhum comentário.</li>}
      </ul>
      <form onSubmit={enviar} className="flex flex-col gap-2">
        <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva um comentário" maxLength={2000} aria-label="Novo comentário" />
        {erroEnvio && <p role="alert" className="text-sm text-destructive">{erroEnvio}</p>}
        <Button type="submit" className="self-start" disabled={enviando || !texto.trim()}>Comentar</Button>
      </form>
    </div>
  );
}

function Historico({ tarefa }: { tarefa: TarefaView }) {
  const { dados, erro } = useDetalhes(tarefa);
  return (
    <div className="flex flex-col gap-2">
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      {!dados && !erro && <p className="text-sm text-muted-foreground">Carregando…</p>}
      <ul className="flex flex-col gap-2">
        {dados?.atividades.map((a) => (
          <li key={a.id} className="text-sm">
            <p>{rotuloAtividade(a.tipo, a.dados)}</p>
            <p className="text-xs text-muted-foreground">{a.autor} · {dataHora(a.em)}</p>
          </li>
        ))}
        {dados && !dados.atividades.length && <li className="text-sm text-muted-foreground">Sem registros.</li>}
      </ul>
    </div>
  );
}
