"use client";

import { useActionState } from "react";
import { assumirTroca, pedirTroca } from "@/server/modules/trocas/actions";
import { Button } from "@/components/ui/button";

export function PedirTrocaBotao({ itemId }: { itemId: string }) {
  const [state, action, pending] = useActionState(pedirTroca, {});
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="itemId" value={itemId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>Pedir troca</Button>
      {state.erro && <span role="alert" className="text-sm text-destructive">{state.erro}</span>}
    </form>
  );
}

export function AssumirTrocaBotao({ trocaId }: { trocaId: string }) {
  const [state, action, pending] = useActionState(assumirTroca, {});
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="trocaId" value={trocaId} />
      <Button type="submit" size="sm" disabled={pending}>Assumir</Button>
      {state.erro && <span role="alert" className="text-sm text-destructive">{state.erro}</span>}
    </form>
  );
}
