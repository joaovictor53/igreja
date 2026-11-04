"use client";

import { useActionState, useRef } from "react";
import { NOMES_TIPO, TIPOS_LIVRO } from "@/lib/registros-constantes";
import { criarLivro } from "@/server/modules/registros/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

export function LivroForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof criarLivro>>, fd: FormData) => {
    const res = await criarLivro(prev, fd);
    if (!res.erro) ref.current?.reset();
    return res;
  }, {});
  return (
    <form ref={ref} action={action} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <Label className="flex-col items-stretch">
        Tipo
        <NativeSelect name="tipo" className="w-full">
          {TIPOS_LIVRO.map((t) => <NativeSelectOption key={t} value={t}>{NOMES_TIPO[t]}</NativeSelectOption>)}
        </NativeSelect>
      </Label>
      <Label className="flex-col items-stretch">
        Número
        <Input name="numero" type="number" min={1} required />
      </Label>
      <Label className="flex-col items-stretch">
        Início
        <Input name="inicio" type="date" />
      </Label>
      <Label className="flex-col items-stretch">
        Fim
        <Input name="fim" type="date" />
      </Label>
      <Button type="submit" disabled={pending} className="self-end">Criar livro</Button>
      {state.erro && <p role="alert" className="col-span-full text-sm text-destructive">{state.erro}</p>}
    </form>
  );
}
