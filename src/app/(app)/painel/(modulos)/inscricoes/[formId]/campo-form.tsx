"use client";

import { useActionState } from "react";
import { adicionarCampo } from "@/server/modules/inscricoes/actions";
import { TIPOS_CAMPO } from "@/lib/formularios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

export function CampoForm({ formularioId }: { formularioId: string }) {
  const [state, action, pending] = useActionState(adicionarCampo, {});

  return (
    <form action={action} className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t pt-4">
      <input type="hidden" name="formularioId" value={formularioId} />
      <Label className="flex-col items-stretch">
        Rótulo
        <Input name="rotulo" required maxLength={120} />
      </Label>
      <Label className="flex-col items-stretch">
        Tipo
        <NativeSelect name="tipo" className="w-full">
          {Object.entries(TIPOS_CAMPO).map(([k, n]) => <NativeSelectOption key={k} value={k}>{n}</NativeSelectOption>)}
        </NativeSelect>
      </Label>
      <Label className="col-span-2 flex-col items-stretch">
        Opções (uma por linha, só para escolha única ou múltipla)
        <textarea
          name="opcoes"
          rows={3}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </Label>
      <Label className="font-normal">
        <input type="checkbox" name="obrigatorio" /> Obrigatório
      </Label>
      <Button type="submit" variant="outline" className="w-fit" disabled={pending}>Adicionar campo</Button>
      {state.erro && (
        <p role="alert" className="col-span-2 text-sm text-destructive">{state.erro}</p>
      )}
    </form>
  );
}
