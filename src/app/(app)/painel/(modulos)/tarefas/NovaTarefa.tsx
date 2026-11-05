"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ROTULO_PRIORIDADE, TAREFA_PRIORIDADES, type CategoriaView, type TarefaPrioridade } from "@/lib/tarefas";
import { criarTarefa } from "@/server/modules/tarefas/actions";
import { EscolherResponsaveis, Textarea } from "./ui";

export function NovaTarefa({
  aberta,
  categoriaInicial,
  categorias,
  pessoas,
  gerir,
  onFechar,
}: {
  aberta: boolean;
  categoriaInicial: string | null;
  categorias: CategoriaView[];
  pessoas: { id: string; nome: string }[];
  gerir: boolean;
  onFechar: () => void;
}) {
  return (
    <Sheet open={aberta} onOpenChange={(a) => !a && onFechar()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {/* key: o formulário recomeça vazio a cada abertura */}
        {aberta && <Formulario categoriaInicial={categoriaInicial} categorias={categorias} pessoas={pessoas} gerir={gerir} onFechar={onFechar} />}
      </SheetContent>
    </Sheet>
  );
}

function Formulario({
  categoriaInicial,
  categorias,
  pessoas,
  gerir,
  onFechar,
}: {
  categoriaInicial: string | null;
  categorias: CategoriaView[];
  pessoas: { id: string; nome: string }[];
  gerir: boolean;
  onFechar: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [observacao, setObservacao] = useState("");
  const [prioridade, setPrioridade] = useState<TarefaPrioridade>("MEDIA");
  const [prazo, setPrazo] = useState("");
  const [categoriaId, setCategoriaId] = useState(categoriaInicial ?? "");
  const [responsaveis, setResponsaveis] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    const r = await criarTarefa({ titulo, descricao, observacao, prioridade, prazo, categoriaId: categoriaId || null, responsaveis });
    setEnviando(false);
    if (r.erro) setErro(r.erro);
    else onFechar();
  }

  return (
    <>
      <SheetHeader className="pr-12">
        <SheetTitle>Nova tarefa</SheetTitle>
        <SheetDescription>{gerir ? "Defina categoria e responsáveis, se quiser." : "A tarefa será atribuída a você."}</SheetDescription>
      </SheetHeader>
      <form onSubmit={enviar} className="flex flex-col gap-3 px-4 pb-4">
        <Label className="flex-col items-stretch">Título<Input value={titulo} onChange={(e) => setTitulo(e.target.value)} required minLength={2} maxLength={200} autoFocus /></Label>
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
        {gerir && (
          <>
            <Label className="flex-col items-stretch">
              Categoria
              <NativeSelect value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="w-full">
                <NativeSelectOption value="">Sem categoria</NativeSelectOption>
                {categorias.map((c) => <NativeSelectOption key={c.id} value={c.id}>{c.nome}</NativeSelectOption>)}
              </NativeSelect>
            </Label>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Responsáveis</span>
              <EscolherResponsaveis pessoas={pessoas} marcadas={responsaveis} onChange={setResponsaveis} />
            </div>
          </>
        )}
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={enviando}>Criar tarefa</Button>
          <Button type="button" variant="outline" onClick={onFechar}>Cancelar</Button>
        </div>
      </form>
    </>
  );
}
