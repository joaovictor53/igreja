"use client";

import { useActionState } from "react";
import { criarParoquia } from "@/server/modules/paroquia/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NovaParoquiaForm() {
  const [state, action, pending] = useActionState(criarParoquia, {});
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
      <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Criar paróquia"}</Button>
    </form>
  );
}
