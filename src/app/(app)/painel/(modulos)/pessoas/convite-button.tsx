"use client";

import { useActionState } from "react";
import { gerarConvite, revogarConvites } from "@/server/modules/convites/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

export function ConviteButton({
  pessoaId,
  pendente,
  papeis,
}: {
  pessoaId: string;
  pendente: boolean;
  /** Só vem preenchido para quem pode escolher o papel; os demais convidam como membro. */
  papeis?: { chave: string; nome: string }[];
}) {
  const [state, action, pending] = useActionState(gerarConvite, {});
  const [revogado, acaoRevogar, revogando] = useActionState(revogarConvites, {});
  return (
    <div className="flex flex-col items-end gap-1">
      <form action={action} className="flex flex-wrap items-center justify-end gap-2">
        <input type="hidden" name="pessoaId" value={pessoaId} />
        {papeis && (
          <NativeSelect name="papel" defaultValue="membro" aria-label="Papel ao aceitar">
            {papeis.map((p) => <NativeSelectOption key={p.chave} value={p.chave}>{p.nome}</NativeSelectOption>)}
          </NativeSelect>
        )}
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pendente ? "Gerar novo convite" : "Gerar convite"}
        </Button>
      </form>
      {state.link && (
        <Input readOnly value={state.link} onFocus={(e) => e.currentTarget.select()} aria-label="Link do convite" className="w-72 max-w-full text-xs" />
      )}
      {state.erro && <p role="alert" className="text-sm text-destructive">{state.erro}</p>}
      {pendente && !state.link && (
        <form action={acaoRevogar}>
          <input type="hidden" name="pessoaId" value={pessoaId} />
          <Button type="submit" variant="ghost" size="sm" disabled={revogando}>Revogar convite pendente</Button>
        </form>
      )}
      {revogado.erro && <p role="alert" className="text-sm text-destructive">{revogado.erro}</p>}
    </div>
  );
}
