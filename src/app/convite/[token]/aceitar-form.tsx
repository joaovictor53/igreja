"use client";

import { useActionState } from "react";
import { aceitarConvite } from "@/server/modules/convites/actions";
import { Button } from "@/components/ui/button";

export function AceitarForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(() => aceitarConvite(token), {});
  return (
    <form action={action} className="flex flex-col gap-3">
      {state.erro && <p role="alert" className="text-sm text-destructive">{state.erro}</p>}
      <Button type="submit" disabled={pending}>Aceitar convite</Button>
    </form>
  );
}
