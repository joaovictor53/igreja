"use client";

import { useActionState } from "react";
import {
  atribuirPapel,
  criarPapel,
  excluirPapel,
  restaurarPapel,
  salvarPapel,
} from "@/server/modules/papeis/actions";
import { PERMISSOES_ATRIBUIVEIS, ROTULOS_PERMISSAO, type Permissao } from "@/lib/permissoes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

const GRUPOS = Object.entries(
  Object.groupBy(PERMISSOES_ATRIBUIVEIS, (p) => ROTULOS_PERMISSAO[p].grupo),
) as [string, Permissao[]][];

function Permissoes({ marcadas }: { marcadas: string[] }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {GRUPOS.map(([grupo, itens]) => (
        <fieldset key={grupo} className="flex flex-col gap-1">
          <legend className="mb-1 text-sm font-medium">{grupo}</legend>
          {itens.map((p) => (
            <label key={p} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="permissoes"
                value={p}
                defaultChecked={marcadas.includes(p)}
                className="mt-0.5 size-4 accent-primary"
              />
              <span>{ROTULOS_PERMISSAO[p].rotulo}</span>
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  );
}

export function NovoPapel() {
  const [state, action, pending] = useActionState(criarPapel, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <Input name="nome" required minLength={2} maxLength={60} placeholder="Nome do papel (ex.: Tesoureiro)" aria-label="Nome do papel" />
      <Permissoes marcadas={[]} />
      <Button type="submit" className="self-start" disabled={pending}>Criar papel</Button>
      {state.erro && <p role="alert" className="text-sm text-destructive">{state.erro}</p>}
      {state.ok && <p role="status" className="text-sm text-muted-foreground">Papel criado.</p>}
    </form>
  );
}

export function EditarPapel({
  chave,
  nome,
  sistema,
  personalizado,
  permissoes,
}: {
  chave: string;
  nome: string;
  sistema: boolean;
  personalizado: boolean;
  permissoes: string[];
}) {
  const [estado, acao, salvando] = useActionState(salvarPapel, {});
  const [estadoRestaurar, acaoRestaurar, restaurando] = useActionState(restaurarPapel, {});
  const [estadoExcluir, acaoExcluir, excluindo] = useActionState(excluirPapel, {});
  const erro = estado.erro ?? estadoRestaurar.erro ?? estadoExcluir.erro;
  return (
    <div className="flex flex-col gap-3">
      <form action={acao} className="flex flex-col gap-4">
        <input type="hidden" name="chave" value={chave} />
        {sistema ? (
          <p className="font-medium">{nome}</p>
        ) : (
          <Input name="nome" defaultValue={nome} required minLength={2} maxLength={60} aria-label="Nome do papel" />
        )}
        {/* key: ao restaurar o padrão, as caixas voltam a refletir o que veio do servidor */}
        <Permissoes key={permissoes.join(",")} marcadas={permissoes} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={salvando}>Salvar</Button>
          {estado.ok && <span role="status" className="self-center text-sm text-muted-foreground">Salvo.</span>}
        </div>
      </form>
      <div className="flex flex-wrap gap-2">
        {sistema && personalizado && (
          <form action={acaoRestaurar}>
            <input type="hidden" name="chave" value={chave} />
            <Button type="submit" variant="outline" size="sm" disabled={restaurando}>Restaurar padrão</Button>
          </form>
        )}
        {!sistema && (
          <form action={acaoExcluir}>
            <input type="hidden" name="chave" value={chave} />
            <Button type="submit" variant="destructive" size="sm" disabled={excluindo}>Excluir papel</Button>
          </form>
        )}
      </div>
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
    </div>
  );
}

export function PapelDoMembro({
  membroId,
  papel,
  opcoes,
  voce,
}: {
  membroId: string;
  papel: string;
  opcoes: { chave: string; nome: string }[];
  voce: boolean;
}) {
  const [state, action, pending] = useActionState(atribuirPapel, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="membroId" value={membroId} />
      <NativeSelect name="papel" defaultValue={papel} disabled={voce} aria-label="Papel">
        {opcoes.map((o) => <NativeSelectOption key={o.chave} value={o.chave}>{o.nome}</NativeSelectOption>)}
      </NativeSelect>
      <Button type="submit" variant="outline" size="sm" disabled={pending || voce}>Salvar</Button>
      {state.erro && <p role="alert" className="w-full text-sm text-destructive">{state.erro}</p>}
    </form>
  );
}
