import { Suspense } from "react";
import Link from "next/link";
import { and, asc, count, desc, eq, ilike } from "drizzle-orm";
import { db } from "@/db";
import { assentos, livros } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { NOMES_TIPO, normalizar } from "@/lib/registros";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { LivroForm } from "./livro-form";

const escaparLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");

async function Busca({ q, d }: { q: string; d: string }) {
  const { paroquia } = await requireParoquia(["admin", "paroco", "secretaria"]);
  const termo = normalizar(q);
  // cada palavra precisa aparecer em algum nome do assento, em qualquer ordem
  const palavras = termo.split(/\s+/).filter(Boolean).slice(0, 6);
  const dataOk = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : "";
  if (!termo && !dataOk) return null;

  const achados = await db
    .select({ a: assentos, tipo: livros.tipo, livro: livros.numero })
    .from(assentos)
    .innerJoin(livros, eq(livros.id, assentos.livroId))
    .where(
      and(
        eq(assentos.paroquiaId, paroquia.id),
        ...palavras.map((w) => ilike(assentos.textoBusca, `%${escaparLike(w)}%`)),
        dataOk ? eq(assentos.data, dataOk) : undefined,
      ),
    )
    .orderBy(desc(assentos.data))
    .limit(50);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resultados ({achados.length})</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {achados.map(({ a, tipo, livro }, i) => (
          <div key={a.id} className="flex flex-col gap-3">
            {i > 0 && <Separator />}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Badge variant="secondary">{NOMES_TIPO[tipo]}</Badge>
                Livro {livro}, folha {a.folha}, termo {a.termo} — {a.data.split("-").reverse().join("/")}
              </span>
              <Link href={`/painel/registros/assentos/${a.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                Abrir
              </Link>
            </div>
          </div>
        ))}
        {!achados.length && <p>Nenhum assento encontrado.</p>}
      </CardContent>
    </Card>
  );
}

async function Livros() {
  const { paroquia } = await requireParoquia(["admin", "paroco", "secretaria"]);
  const lista = await db
    .select({ l: livros, assentos: count(assentos.id) })
    .from(livros)
    .leftJoin(assentos, eq(assentos.livroId, livros.id))
    .where(eq(livros.paroquiaId, paroquia.id))
    .groupBy(livros.id)
    .orderBy(asc(livros.tipo), asc(livros.numero));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Livros</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <LivroForm />
        <Separator />
        {lista.map(({ l, assentos: n }) => (
          <div key={l.id} className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Badge variant="secondary">{NOMES_TIPO[l.tipo]}</Badge>
              Livro {l.numero} — {n} assento(s)
            </span>
            <Link href={`/painel/registros/livros/${l.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Abrir
            </Link>
          </div>
        ))}
        {!lista.length && <p>Nenhum livro cadastrado.</p>}
      </CardContent>
    </Card>
  );
}

export default function Page({ searchParams }: PageProps<"/painel/registros">) {
  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Livros e certidões</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        O sistema é um índice digital: o livro físico continua sendo o documento oficial.
      </p>
      <div className="flex flex-col gap-6">
        <Suspense fallback={<p>Carregando…</p>}>
          <Conteudo searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function Conteudo({ searchParams }: { searchParams: Promise<{ q?: string; d?: string }> }) {
  const { q = "", d = "" } = await searchParams;
  return (
    <>
      <form method="get" className="flex flex-wrap items-end gap-3">
        <Label className="flex-1 flex-col items-stretch">
          Buscar por nome (pessoa, pai, mãe, padrinhos…)
          <Input name="q" defaultValue={q} placeholder="Ex.: jose conceicao" />
        </Label>
        <Label className="flex-col items-stretch">
          Data do registro
          <Input name="d" type="date" defaultValue={d} />
        </Label>
        <Button type="submit" variant="outline">Buscar</Button>
      </form>
      <Busca q={q} d={d} />
      <Livros />
    </>
  );
}
