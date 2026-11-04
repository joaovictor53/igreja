"use client";

import { useEffect, useState } from "react";
import { BellRingIcon } from "lucide-react";
import { removerInscricaoPush, salvarInscricaoPush } from "@/server/modules/notificacoes/actions";
import { Button } from "@/components/ui/button";

type Estado = "carregando" | "indisponivel" | "bloqueado" | "inativo" | "ativo";

const CHAVE = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function chaveParaUint8(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const bin = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function AtivarPush() {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [erro, setErro] = useState("");

  useEffect(() => {
    let cancelado = false;
    (async () => {
      if (!CHAVE || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        if (!cancelado) setEstado("indisponivel");
        return;
      }
      if (Notification.permission === "denied") return void (!cancelado && setEstado("bloqueado"));
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (!cancelado) setEstado(sub && Notification.permission === "granted" ? "ativo" : "inativo");
    })().catch(() => !cancelado && setEstado("indisponivel"));
    return () => {
      cancelado = true;
    };
  }, []);

  async function ativar() {
    setErro("");
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") return setEstado(permissao === "denied" ? "bloqueado" : "inativo");
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaUint8(CHAVE) }));
      await salvarInscricaoPush(sub.toJSON());
      setEstado("ativo");
    } catch (e) {
      setErro("Não foi possível ativar os avisos neste navegador.");
      console.warn("[push]", e);
    }
  }

  async function desativar() {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await removerInscricaoPush(sub.endpoint);
      await sub.unsubscribe();
    }
    setEstado("inativo");
  }

  if (estado === "carregando" || estado === "indisponivel") return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      {estado === "bloqueado" && <span className="text-muted-foreground">Avisos bloqueados no navegador</span>}
      {estado === "inativo" && (
        <Button type="button" variant="outline" size="sm" onClick={ativar}>
          <BellRingIcon /> Ativar avisos neste aparelho
        </Button>
      )}
      {estado === "ativo" && (
        <Button type="button" variant="ghost" size="sm" onClick={desativar}>
          Desativar avisos neste aparelho
        </Button>
      )}
      {erro && <span role="alert" className="text-destructive">{erro}</span>}
    </div>
  );
}
