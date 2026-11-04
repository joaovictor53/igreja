import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { paroquias } from "@/db/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PedidoForm } from "./form";

async function nomeDaParoquia(slug: string) {
  const [p] = await db.select({ nome: paroquias.nome }).from(paroquias).where(eq(paroquias.slug, slug));
  return p?.nome ?? null;
}

export async function generateMetadata({ params }: PageProps<"/[slug]/pedido">): Promise<Metadata> {
  const { slug } = await params;
  const nome = await nomeDaParoquia(slug);
  if (!nome) notFound();
  return { title: `Pedido pastoral — ${nome}` };
}

async function Conteudo({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const nome = await nomeDaParoquia(slug);
  if (!nome) notFound();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Pedido pastoral</CardTitle>
        <CardDescription>{nome}</CardDescription>
      </CardHeader>
      <CardContent>
        <PedidoForm slug={slug} />
      </CardContent>
    </Card>
  );
}

export default function Page({ params }: PageProps<"/[slug]/pedido">) {
  return (
    <main className="mx-auto w-full max-w-lg p-6">
      <Suspense fallback={<p>Carregando…</p>}>
        <Conteudo params={params} />
      </Suspense>
    </main>
  );
}
