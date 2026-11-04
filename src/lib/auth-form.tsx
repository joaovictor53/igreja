"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { caminhoSeguro } from "@/lib/redirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({ modo }: { modo: "login" | "cadastro" }) {
  const router = useRouter();
  const next = caminhoSeguro(useSearchParams().get("next"));
  const nextQuery = next === "/painel" ? "" : `?next=${encodeURIComponent(next)}`;
  const [erro, setErro] = useState("");
  const [pending, setPending] = useState(false);
  const [mostrar, setMostrar] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setErro("");
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const password = String(f.get("password"));
    const res =
      modo === "login"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name: String(f.get("name")) });
    setPending(false);
    if (res.error) return setErro(res.error.message ?? "Não foi possível continuar");
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {modo === "cadastro" && (
        <Label className="flex-col items-stretch">
          Nome
          <Input name="name" required />
        </Label>
      )}
      <Label className="flex-col items-stretch">
        E-mail
        <Input name="email" type="email" autoComplete="email" required />
      </Label>
      <Label className="flex-col items-stretch">
        Senha
        <span className="relative">
          <Input
            name="password"
            type={mostrar ? "text" : "password"}
            minLength={8}
            required
            autoComplete={modo === "login" ? "current-password" : "new-password"}
            className="pr-9"
          />
          <button
            type="button"
            onClick={() => setMostrar((m) => !m)}
            aria-label={mostrar ? "Ocultar senha" : "Mostrar senha"}
            className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {mostrar ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        </span>
      </Label>
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Aguarde…" : modo === "login" ? "Entrar" : "Criar conta"}
      </Button>
      <Link href={(modo === "login" ? "/cadastro" : "/login") + nextQuery} className="text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        {modo === "login" ? "Ainda não tem conta? Criar uma" : "Já tenho conta"}
      </Link>
    </form>
  );
}
