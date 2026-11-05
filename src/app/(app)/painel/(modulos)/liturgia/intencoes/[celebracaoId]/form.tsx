"use client";

import { useActionState, useRef } from "react";
import { TIPOS } from "@/lib/intencoes";
import { criarIntencao } from "@/server/modules/intencoes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

export function IntencaoForm({ celebracaoId }: { celebracaoId: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(async (prev: Parameters<typeof criarIntencao>[0], fd: FormData) => {
    const res = await criarIntencao(prev, fd);
    if (res.ok) ref.current?.reset();
    return res;
  }, {});
  return (
    <form ref={ref} action={action} className="my-4 flex flex-col gap-3 print:hidden">
      <input type="hidden" name="celebracaoId" value={celebracaoId} />
      <Label className="flex-col items-stretch">
        Tipo
        <NativeSelect name="tipo" className="w-full">
          {Object.entries(TIPOS).map(([v, n]) => <NativeSelectOption key={v} value={v}>{n}</NativeSelectOption>)}
        </NativeSelect>
      </Label>
      <Label className="flex-col items-stretch">
        Intenção
        <Input name="texto" required />
      </Label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Label className="flex-col items-stretch">
          Solicitante
          <Input name="solicitanteNome" />
        </Label>
        <Label className="flex-col items-stretch">
          Contato
          <Input name="solicitanteContato" />
        </Label>
      </div>
      {state.erro && <p role="alert" className="text-sm text-destructive">{state.erro}</p>}
      {state.aviso && <p role="status" className="text-sm text-amber-700 dark:text-amber-400">{state.aviso}</p>}
      <Button type="submit" disabled={pending}>Registrar</Button>
    </form>
  );
}
