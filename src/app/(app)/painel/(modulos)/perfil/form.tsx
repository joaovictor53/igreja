"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PerfilForm({ nome, email, papel }: { nome: string; email: string; papel: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  async function salvarNome(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const novo = String(new FormData(e.currentTarget).get("nome")).trim();
    const { error } = await authClient.updateUser({ name: novo });
    setMsg(error ? { ok: false, texto: "Não foi possível salvar o nome." } : { ok: true, texto: "Nome atualizado." });
    router.refresh();
  }

  async function trocarSenha(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const { error } = await authClient.changePassword({
      currentPassword: String(f.get("atual")),
      newPassword: String(f.get("nova")),
      revokeOtherSessions: true,
    });
    if (error) return setMsg({ ok: false, texto: "Senha atual incorreta ou nova senha inválida." });
    form.reset();
    setMsg({ ok: true, texto: "Senha alterada." });
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        {email} · perfil: {papel}
      </p>
      <form onSubmit={salvarNome} className="flex flex-col gap-3">
        <Label className="flex-col items-stretch">
          Nome
          <Input name="nome" defaultValue={nome} required minLength={2} />
        </Label>
        <Button type="submit">Salvar nome</Button>
      </form>
      <form onSubmit={trocarSenha} className="flex flex-col gap-3">
        <Label className="flex-col items-stretch">
          Senha atual
          <Input name="atual" type="password" autoComplete="current-password" required />
        </Label>
        <Label className="flex-col items-stretch">
          Nova senha
          <Input name="nova" type="password" autoComplete="new-password" required minLength={8} />
        </Label>
        <Button type="submit" variant="outline">Trocar senha</Button>
      </form>
      {msg && (
        <p role="status" className={msg.ok ? "text-sm" : "text-sm text-destructive"}>
          {msg.texto}
        </p>
      )}
    </div>
  );
}
