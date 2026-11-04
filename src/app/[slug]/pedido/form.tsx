"use client";

import { useActionState } from "react";
import { criarPedido } from "@/server/modules/pedidos/actions";
import { TIPOS_PEDIDO } from "@/lib/pedidos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

const TEXTAREA =
  "min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function PedidoForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState(criarPedido, {});

  if (state.ok) {
    return <p role="status">Pedido recebido. Entraremos em contato pelo telefone informado.</p>;
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="slug" value={slug} />
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <input name="website_url" tabIndex={-1} autoComplete="off" />
      </div>
      <Label className="flex-col items-stretch">
        Tipo de pedido
        <NativeSelect name="tipo" className="w-full">
          {Object.entries(TIPOS_PEDIDO).map(([v, n]) => <NativeSelectOption key={v} value={v}>{n}</NativeSelectOption>)}
        </NativeSelect>
      </Label>
      <Label className="items-start font-normal leading-snug">
        <input type="checkbox" name="urgente" className="mt-0.5" /> É urgente (ex.: pessoa em estado grave)
      </Label>
      <Label className="flex-col items-stretch">
        Seu nome
        <Input name="solicitanteNome" required maxLength={120} />
      </Label>
      <Label className="flex-col items-stretch">
        Telefone para contato
        <Input name="contato" type="tel" required maxLength={60} />
      </Label>
      <Label className="flex-col items-stretch">
        Endereço (se for visita)
        <Input name="endereco" maxLength={300} />
      </Label>
      <Label className="flex-col items-stretch">
        Detalhes
        <textarea name="descricao" maxLength={2000} className={TEXTAREA} />
      </Label>
      {state.erro && <p role="alert" className="text-sm text-destructive">{state.erro}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Enviando…" : "Enviar pedido"}</Button>
    </form>
  );
}
