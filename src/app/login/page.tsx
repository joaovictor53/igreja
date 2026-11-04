import { Suspense } from "react";
import { AuthForm } from "@/lib/auth-form";
import { RedirecionaSeLogado } from "@/lib/ja-logado";
import { AuthShell } from "@/components/auth-shell";

export default function Page() {
  return (
    <AuthShell titulo="Bem-vindo de volta" subtitulo="Entre com o e-mail e a senha da sua conta.">
      <Suspense>
        <RedirecionaSeLogado />
        <AuthForm modo="login" />
      </Suspense>
    </AuthShell>
  );
}
