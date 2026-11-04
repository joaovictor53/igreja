"use client";

import { useActionState } from "react";
import { NOMES_PAPEL, PAPEIS_ASSENTO, type PapelAssento, type TipoRegistro } from "@/lib/registros-constantes";
import { criarAssento } from "@/server/modules/registros/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

const PADRAO: Record<TipoRegistro, PapelAssento[]> = {
  batismo: ["principal", "pai", "mae", "padrinho", "madrinha", "testemunha"],
  eucaristia: ["principal", "pai", "mae", "padrinho", "madrinha", "testemunha"],
  crisma: ["principal", "pai", "mae", "padrinho", "madrinha", "testemunha"],
  casamento: ["principal", "conjuge", "pai", "mae", "testemunha", "testemunha"],
  obito: ["principal", "pai", "mae", "conjuge", "testemunha", "testemunha"],
};
const LINHAS = 8;

export function AssentoForm({ livroId, tipo }: { livroId: string; tipo: TipoRegistro }) {
  const [state, action, pending] = useActionState(criarAssento, {});
  const padrao = PADRAO[tipo];
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="livroId" value={livroId} />
      <div className="grid grid-cols-3 gap-3">
        <Label className="flex-col items-stretch">
          Folha
          <Input name="folha" required maxLength={20} />
        </Label>
        <Label className="flex-col items-stretch">
          Termo
          <Input name="termo" required maxLength={20} />
        </Label>
        <Label className="flex-col items-stretch">
          Data do sacramento
          <Input name="data" type="date" required />
        </Label>
      </div>
      <Label className="flex-col items-stretch">
        Celebrante
        <Input name="celebrante" maxLength={200} />
      </Label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Pessoas (linhas sem nome são ignoradas)</legend>
        {Array.from({ length: LINHAS }, (_, i) => (
          <div key={i} className="grid grid-cols-[10rem_1fr] gap-2">
            <NativeSelect name={`pessoa_papel_${i}`} defaultValue={padrao[i] ?? "testemunha"} aria-label={`Papel da pessoa ${i + 1}`} className="w-full">
              {PAPEIS_ASSENTO.map((p) => <NativeSelectOption key={p} value={p}>{NOMES_PAPEL[p]}</NativeSelectOption>)}
            </NativeSelect>
            <Input name={`pessoa_nome_${i}`} maxLength={200} aria-label={`Nome da pessoa ${i + 1}`} />
          </div>
        ))}
      </fieldset>
      <Label className="flex-col items-stretch">
        Observações
        <textarea
          name="observacoes"
          rows={2}
          maxLength={2000}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </Label>
      {state.erro && <p role="alert" className="text-sm text-destructive">{state.erro}</p>}
      <Button type="submit" disabled={pending} className="w-fit">{pending ? "Salvando…" : "Registrar assento"}</Button>
    </form>
  );
}
