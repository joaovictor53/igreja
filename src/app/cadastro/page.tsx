import { Suspense } from "react";
import { AuthForm } from "@/lib/auth-form";
import { RedirecionaSeLogado } from "@/lib/ja-logado";
import { AuthShell } from "@/components/auth-shell";

export default function Page() {
  return (
    <AuthShell titulo="Criar conta" subtitulo="Cadastre-se para organizar a secretaria da sua paróquia.">
      <Suspense>
        <RedirecionaSeLogado />
        <AuthForm modo="cadastro" />
      </Suspense>
    </AuthShell>
  );
}
