"use client";

import { useActionState, useState } from "react";
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
    <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
      <Label className="flex-col items-stretch">
        Nome
        <Input name="nome" required maxLength={120} />
      </Label>
      <Label className="flex-col items-stretch">
        Endereço (opcional)
        <Input name="endereco" maxLength={300} />
      </Label>
      <Button type="submit" className="self-end" disabled={pending}>Adicionar</Button>
      {state.erro && <p role="alert" className="text-sm text-destructive sm:col-span-3">{state.erro}</p>}
    </form>
  );
}

export function LinhaComunidade({ id, nome, endereco }: { id: string; nome: string; endereco: string | null }) {
  const [editando, setEditando] = useState(false);
  const [estadoEdicao, acaoEdicao, salvando] = useActionState(async (anterior: Awaited<ReturnType<typeof editarComunidade>>, fd: FormData) => {
    const r = await editarComunidade(anterior, fd);
    if (r.ok) setEditando(false);
    return r;
  }, {});
  const [estadoExclusao, acaoExclusao, excluindo] = useActionState(excluirComunidade, {});

  if (editando) {
    return (
      <form action={acaoEdicao} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
        <input type="hidden" name="id" value={id} />
        <Input name="nome" defaultValue={nome} required maxLength={120} aria-label="Nome" />
        <Input name="endereco" defaultValue={endereco ?? ""} maxLength={300} aria-label="Endereço" />
        <Button type="submit" size="sm" disabled={salvando}>Salvar</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setEditando(false)}>Cancelar</Button>
        {estadoEdicao.erro && <p role="alert" className="text-sm text-destructive sm:col-span-4">{estadoEdicao.erro}</p>}
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <strong>{nome}</strong>
          {endereco && <p className="text-sm text-muted-foreground">{endereco}</p>}
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
