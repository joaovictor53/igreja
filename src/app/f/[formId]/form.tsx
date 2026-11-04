"use client";

import { useActionState } from "react";
import { enviarResposta } from "@/server/modules/inscricoes/actions";
import { prefixoCampo, type Campo } from "@/lib/formularios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

const TEXTAREA =
  "min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function FormularioPublico({ formularioId, campos }: { formularioId: string; campos: Campo[] }) {
  const [state, action, pending] = useActionState(enviarResposta, {});

  if (state.ok) {
    return <p role="status">Inscrição enviada. A secretaria entrará em contato. Obrigado!</p>;
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="formularioId" value={formularioId} />
      {/* honeypot: invisível para pessoas, robôs costumam preencher */}
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <input name="website_url" tabIndex={-1} autoComplete="off" />
      </div>
      {campos.map((c) => {
        const name = prefixoCampo + c.id;
        const req = c.obrigatorio;
        switch (c.tipo) {
          case "texto_longo":
            return (
              <Label key={c.id} className="flex-col items-stretch">
                {c.rotulo}
                <textarea name={name} required={req} maxLength={2000} className={TEXTAREA} />
              </Label>
            );
          case "escolha_unica":
            return (
              <Label key={c.id} className="flex-col items-stretch">
                {c.rotulo}
                <NativeSelect name={name} required={req} className="w-full" defaultValue="">
                  <NativeSelectOption value="" disabled>Selecione</NativeSelectOption>
                  {c.opcoes?.map((o) => <NativeSelectOption key={o} value={o}>{o}</NativeSelectOption>)}
                </NativeSelect>
              </Label>
            );
          case "escolha_multipla":
            return (
              <fieldset key={c.id} className="flex flex-col gap-2">
                <legend className="mb-1 text-sm font-medium">{c.rotulo}</legend>
                {c.opcoes?.map((o) => (
                  <Label key={o} className="font-normal">
                    <input type="checkbox" name={name} value={o} /> {o}
                  </Label>
                ))}
              </fieldset>
            );
          case "aceite":
            return (
              <Label key={c.id} className="items-start font-normal leading-snug">
                <input type="checkbox" name={name} required={req} className="mt-0.5" /> {c.rotulo}
              </Label>
            );
          default: {
            const type = { data: "date", telefone: "tel", email: "email", texto: "text" }[c.tipo];
            return (
              <Label key={c.id} className="flex-col items-stretch">
                {c.rotulo}
                <Input name={name} type={type} required={req} maxLength={200} />
              </Label>
            );
          }
        }
      })}
      {state.erro && <p role="alert" className="text-sm text-destructive">{state.erro}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Enviando…" : "Enviar inscrição"}</Button>
    </form>
  );
}
