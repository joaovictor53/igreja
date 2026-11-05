import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { assentoPessoas, assentos, livros } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { nomePrincipal, NOMES_TIPO } from "@/lib/registros";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AssentoForm } from "./assento-form";

async function Conteudo({ params }: { params: Promise<{ livroId: string }> }) {
  const { livroId } = await params;
  if (!z.uuid().safeParse(livroId).success) notFound();
  const { paroquia } = await requireParoquia("registros:gerir");
  const [livro] = await db
    .select()
    .from(livros)
    .where(and(eq(livros.id, livroId), eq(livros.paroquiaId, paroquia.id)));
  if (!livro) notFound();

  const [lista, pessoas] = await Promise.all([
    db.select().from(assentos).where(eq(assentos.livroId, livro.id)).orderBy(asc(assentos.folha), asc(assentos.termo)),
    db
      .select({ assentoId: assentoPessoas.assentoId, papel: assentoPessoas.papel, nome: assentoPessoas.nome })
      .from(assentoPessoas)
      .innerJoin(assentos, eq(assentos.id, assentoPessoas.assentoId))
      .where(eq(assentos.livroId, livro.id)),
  ]);
  const porAssento = Map.groupBy(pessoas, (p) => p.assentoId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Livro de {NOMES_TIPO[livro.tipo].toLowerCase()} nº {livro.numero}
        </h1>
        <Link href="/painel/registros" className="text-sm underline">← Todos os livros</Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Novo assento</CardTitle>
        </CardHeader>
        <CardContent>
          <AssentoForm livroId={livro.id} tipo={livro.tipo} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Assentos ({lista.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {lista.map((a, i) => (
            <div key={a.id} className="flex flex-col gap-3">
              {i > 0 && <Separator />}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  Folha {a.folha}, termo {a.termo} — {nomePrincipal(porAssento.get(a.id) ?? [], livro.tipo)}
                </span>
                <Link href={`/painel/registros/assentos/${a.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Abrir
                </Link>
              </div>
            </div>
          ))}
          {!lista.length && <p>Nenhum assento neste livro.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page({ params }: PageProps<"/painel/registros/livros/[livroId]">) {
  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <Suspense fallback={<p>Carregando…</p>}>
        <Conteudo params={params} />
      </Suspense>
    </main>
  );
}
