"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

type Tipo = "link" | "whatsapp" | "wifi" | "pix";

const ROTULOS: Record<Tipo, string> = {
  link: "Link",
  whatsapp: "WhatsApp",
  wifi: "Wi-Fi",
  pix: "Pix (código copia e cola)",
};

/** O WhatsApp aceita só dígitos, com o código do país. */
function whatsapp(numero: string, mensagem: string) {
  let n = numero.replace(/\D/g, "");
  if (n.length <= 11) n = `55${n}`;
  return `https://wa.me/${n}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ""}`;
}

const escaparWifi = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");

export function QrForm() {
  const [tipo, setTipo] = useState<Tipo>("link");
  const [titulo, setTitulo] = useState("");
  const [valor, setValor] = useState("");
  const [extra, setExtra] = useState("");
  const [imagem, setImagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function gerar(e: React.FormEvent) {
    e.preventDefault();
    const conteudo =
      tipo === "whatsapp"
        ? whatsapp(valor, extra)
        : tipo === "wifi"
          ? `WIFI:T:${extra ? "WPA" : "nopass"};S:${escaparWifi(valor)};P:${escaparWifi(extra)};;`
          : valor.trim();
    try {
      setImagem(await QRCode.toDataURL(conteudo, { width: 480, margin: 2 }));
      setErro(null);
    } catch {
      setImagem(null);
      setErro("Conteúdo grande demais para um QR Code.");
    }
  }

  const rotuloValor = { link: "Endereço (https://…)", whatsapp: "Número com DDD", wifi: "Nome da rede", pix: "Código Pix copia e cola" }[tipo];
  const rotuloExtra = { link: "", whatsapp: "Mensagem inicial (opcional)", wifi: "Senha (deixe vazio se for aberta)", pix: "" }[tipo];

  return (
    <>
      <form onSubmit={gerar} className="grid gap-3 print:hidden">
        <Label className="flex-col items-stretch">
          Tipo
          <NativeSelect
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value as Tipo);
              setImagem(null);
            }}
            className="w-full"
          >
            {(Object.keys(ROTULOS) as Tipo[]).map((t) => <NativeSelectOption key={t} value={t}>{ROTULOS[t]}</NativeSelectOption>)}
          </NativeSelect>
        </Label>
        <Label className="flex-col items-stretch">
          Título do cartaz
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Inscrições da catequese" />
        </Label>
        <Label className="flex-col items-stretch">
          {rotuloValor}
          <Input value={valor} onChange={(e) => setValor(e.target.value)} required />
        </Label>
        {rotuloExtra && (
          <Label className="flex-col items-stretch">
            {rotuloExtra}
            <Input value={extra} onChange={(e) => setExtra(e.target.value)} />
          </Label>
        )}
        <Button type="submit">Gerar QR Code</Button>
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      </form>
      {imagem && (
        <section className="mt-6 flex flex-col items-center gap-3 text-center">
          {titulo && <h2 className="text-3xl font-semibold">{titulo}</h2>}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagem} alt="QR Code gerado" width={320} height={320} />
          <p className="text-sm">Aponte a câmera do celular para o código</p>
          <Button type="button" variant="outline" className="print:hidden" onClick={() => window.print()}>
            Imprimir cartaz
          </Button>
        </section>
      )}
    </>
  );
}
