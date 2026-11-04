"use client";

import { useActionState } from "react";
import { gerarConvite } from "@/server/modules/convites/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ConviteButton({ pessoaId }: { pessoaId: string }) {
  const [state, action, pending] = useActionState(gerarConvite, {});
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="pessoaId" value={pessoaId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>Gerar convite</Button>
      {state.link && (
        <Input readOnly value={state.link} onFocus={(e) => e.currentTarget.select()} aria-label="Link do convite" className="w-72 text-xs" />
      )}
      {state.erro && <p role="alert" className="text-sm text-destructive">{state.erro}</p>}
    </form>
  );
}
