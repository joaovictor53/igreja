"use client";

import { useActionState, useEffect } from "react";
import { criarParoquia } from "@/server/modules/paroquia/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NovaParoquiaForm() {
  const [state, action, pending] = useActionState(criarParoquia, {});

  // Navegação completa: o cache de rotas do cliente ainda lembra que /painel mandava para este cadastro.
  useEffect(() => {
    if (state.ok) window.location.assign("/painel");
  }, [state.ok]);

  return (
    <form action={action} className="flex flex-col gap-3">
      <Label className="flex-col items-stretch">
        Nome da paróquia
        <Input name="nome" required />
      </Label>
      <Label className="flex-col items-stretch">
        Endereço público (slug)
        <Input name="slug" required placeholder="sao-jose-operario" />
      </Label>
      <Label className="flex-col items-stretch">
        Comunidade matriz
        <Input name="comunidade" required />
      </Label>
      {state.erro && <p role="alert" className="text-sm text-destructive">{state.erro}</p>}
      <Button type="submit" disabled={pending || state.ok}>{pending || state.ok ? "Salvando…" : "Criar paróquia"}</Button>
    </form>
  );
}
