"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  criarComunidade,
  editarComunidade,
  excluirComunidade,
} from "@/server/modules/comunidades/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NovaComunidade() {
  const [state, action, pending] = useActionState(criarComunidade, {});
  return (
    <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Label className="flex-col items-stretch">
        Nome
        <Input name="nome" defaultValue={state.valores?.nome} required maxLength={120} />
      </Label>
      <Label className="flex-col items-stretch">
        Endereço (opcional)
        <Input name="endereco" defaultValue={state.valores?.endereco} maxLength={300} />
      </Label>
      <Label className="flex-col items-stretch">
        Telefone (opcional)
        <Input name="telefone" defaultValue={state.valores?.telefone} type="tel" maxLength={40} />
      </Label>
      <Label className="flex-col items-stretch">
        WhatsApp (opcional)
        <Input name="whatsapp" defaultValue={state.valores?.whatsapp} type="tel" maxLength={40} placeholder="(92) 99999-0000" />
      </Label>
      <Label className="flex-col items-stretch">
        Link do mapa (opcional)
        <Input name="mapaUrl" defaultValue={state.valores?.mapaUrl} type="url" maxLength={500} placeholder="https://maps.app.goo.gl/…" />
      </Label>
      <Label className="flex-col items-stretch sm:col-span-2">
        Apresentação para a página pública (opcional)
        <textarea name="descricao" defaultValue={state.valores?.descricao} maxLength={2000} rows={3} className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
      </Label>
      <Button type="submit" className="w-fit" disabled={pending}>Adicionar</Button>
      {state.erro && <p role="alert" className="text-sm text-destructive sm:col-span-2">{state.erro}</p>}
    </form>
  );
}

export function LinhaComunidade({
  id,
  nome,
  endereco,
  telefone,
  descricao,
  whatsapp,
  mapaUrl,
  fotoEm,
  caminhoPublico,
}: {
  id: string;
  nome: string;
  endereco: string | null;
  telefone: string | null;
  descricao: string | null;
  whatsapp: string | null;
  mapaUrl: string | null;
  fotoEm: string | null;
  caminhoPublico: string;
}) {
  const [editando, setEditando] = useState(false);
  const [estadoEdicao, acaoEdicao, salvando] = useActionState(async (anterior: Awaited<ReturnType<typeof editarComunidade>>, fd: FormData) => {
    const r = await editarComunidade(anterior, fd);
    if (r.ok) setEditando(false);
    return r;
  }, {});
  const [estadoExclusao, acaoExclusao, excluindo] = useActionState(excluirComunidade, {});

  if (editando) {
    return (
      <form action={acaoEdicao} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input type="hidden" name="id" value={id} />
        <Input name="nome" defaultValue={estadoEdicao.valores?.nome ?? nome} required maxLength={120} aria-label="Nome" />
        <Input name="endereco" defaultValue={estadoEdicao.valores?.endereco ?? endereco ?? ""} maxLength={300} aria-label="Endereço" placeholder="Endereço" />
        <Input name="telefone" type="tel" defaultValue={estadoEdicao.valores?.telefone ?? telefone ?? ""} maxLength={40} aria-label="Telefone" placeholder="Telefone" />
        <Input name="whatsapp" type="tel" defaultValue={estadoEdicao.valores?.whatsapp ?? whatsapp ?? ""} maxLength={40} aria-label="WhatsApp" placeholder="WhatsApp, ex.: (92) 99999-0000" />
        <Input name="mapaUrl" type="url" defaultValue={estadoEdicao.valores?.mapaUrl ?? mapaUrl ?? ""} maxLength={500} aria-label="Link do mapa" placeholder="Link do mapa (Google Maps, Waze…)" />
        <textarea name="descricao" defaultValue={estadoEdicao.valores?.descricao ?? descricao ?? ""} maxLength={2000} rows={3} aria-label="Apresentação" placeholder="Apresentação para a página pública" className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:col-span-2" />
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" size="sm" disabled={salvando}>Salvar</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setEditando(false)}>Cancelar</Button>
        </div>
        {estadoEdicao.erro && <p role="alert" className="text-sm text-destructive sm:col-span-2">{estadoEdicao.erro}</p>}
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <strong>{nome}</strong>
          {endereco && <p className="text-sm text-muted-foreground">{endereco}</p>}
          <a className="text-sm underline" href={caminhoPublico}>Página pública</a>
          <FotoComunidade id={id} fotoEm={fotoEm} />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setEditando(true)}>Editar</Button>
          <form action={acaoExclusao}>
            <input type="hidden" name="id" value={id} />
            <Button type="submit" variant="destructive" size="sm" disabled={excluindo}>Excluir</Button>
          </form>
        </div>
      </div>
      {estadoExclusao.erro && <p role="alert" className="text-sm text-destructive">{estadoExclusao.erro}</p>}
    </div>
  );
}

/** Envia/remove a foto pela rota da API (o limite de corpo das server actions é pequeno demais para imagens). */
function FotoComunidade({ id, fotoEm }: { id: string; fotoEm: string | null }) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function chamar(metodo: "POST" | "DELETE", corpo?: FormData) {
    setOcupado(true);
    setErro(null);
    try {
      const r = await fetch(`/api/comunidades/${id}/foto`, { method: metodo, body: corpo });
      if (!r.ok) setErro(((await r.json().catch(() => null)) as { erro?: string } | null)?.erro ?? "Não foi possível salvar a foto.");
      else router.refresh();
    } finally {
      setOcupado(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    const fd = new FormData();
    fd.set("foto", arquivo);
    void chamar("POST", fd);
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {fotoEm && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/comunidades/${id}/foto?v=${encodeURIComponent(fotoEm)}`} alt="" className="h-16 w-24 rounded-md border object-cover" />
      )}
      <input ref={entrada} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" id={`foto-${id}`} onChange={aoEscolher} disabled={ocupado} />
      <Button type="button" variant="outline" size="sm" disabled={ocupado} onClick={() => entrada.current?.click()}>
        {fotoEm ? "Trocar foto" : "Adicionar foto"}
      </Button>
      {fotoEm && <Button type="button" variant="ghost" size="sm" disabled={ocupado} onClick={() => chamar("DELETE")}>Remover foto</Button>}
      {erro && <p role="alert" className="w-full text-sm text-destructive">{erro}</p>}
    </div>
  );
}
