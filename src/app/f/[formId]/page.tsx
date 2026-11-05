import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { formularios, paroquias } from "@/db/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormularioPublico } from "./form";

async function buscar(formId: string) {
  if (!z.uuid().safeParse(formId).success) return null;
  const [row] = await db
    .select({ f: formularios, paroquia: paroquias.nome })
    .from(formularios)
    .innerJoin(paroquias, eq(paroquias.id, formularios.paroquiaId))
    .where(eq(formularios.id, formId));
  return row ?? null;
}

export async function generateMetadata({ params }: PageProps<"/f/[formId]">): Promise<Metadata> {
  const { formId } = await params;
  const row = await buscar(formId);
  if (!row) notFound();
  return { title: `${row.f.titulo} — ${row.paroquia}` };
}

async function Conteudo({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params;
  const row = await buscar(formId);
  if (!row) notFound();
  const { f, paroquia } = row;
  const agora = new Date();
  const aberto = f.ativo && (!f.abreEm || agora >= f.abreEm) && (!f.fechaEm || agora <= f.fechaEm);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{f.titulo}</CardTitle>
        <CardDescription>{paroquia}</CardDescription>
      </CardHeader>
      <CardContent>
        {aberto ? <FormularioPublico formularioId={f.id} campos={f.campos} /> : <p>As inscrições não estão abertas no momento.</p>}
      </CardContent>
    </Card>
  );
}

export default function Page({ params }: PageProps<"/f/[formId]">) {
  return (
    <main className="mx-auto w-full max-w-lg p-4 sm:p-6">
      <Suspense fallback={<p>Carregando…</p>}>
        <Conteudo params={params} />
      </Suspense>
    </main>
  );
}
