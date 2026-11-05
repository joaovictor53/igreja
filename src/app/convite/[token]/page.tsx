import { Suspense } from "react";
import Link from "next/link";
import { getSession } from "@/server/auth/session";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AceitarForm } from "./aceitar-form";

async function Conteudo({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await getSession();
  if (!session) {
    const next = encodeURIComponent(`/convite/${token}`);
    return (
      <>
        <CardHeader>
          <CardTitle>Convite</CardTitle>
          <CardDescription>Entre ou crie uma conta para aceitar o convite.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Link className={buttonVariants()} href={`/login?next=${next}`}>Entrar</Link>
          <Link className={buttonVariants({ variant: "outline" })} href={`/cadastro?next=${next}`}>Criar conta</Link>
        </CardContent>
      </>
    );
  }
  return (
    <>
      <CardHeader>
        <CardTitle>Convite</CardTitle>
        <CardDescription>
          Você está entrando como {session.user.name}. Aceitar o convite vincula esta conta à sua ficha na paróquia.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AceitarForm token={token} />
      </CardContent>
    </>
  );
}

export default function Page({ params }: PageProps<"/convite/[token]">) {
  return (
    <main className="mx-auto w-full max-w-md p-4 sm:p-6">
      <Card>
        <Suspense fallback={<CardContent>Carregando…</CardContent>}>
          <Conteudo params={params} />
        </Suspense>
      </Card>
    </main>
  );
}
