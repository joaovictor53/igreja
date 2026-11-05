import { Suspense } from "react";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { certidoes, paroquias } from "@/db/schema";
import { NOMES_TIPO, codigoValido } from "@/lib/registros";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Validação de certidão",
  robots: { index: false, follow: false },
};

/** Página pública: mostra somente o mínimo para conferir a certidão (LGPD, minimização). */
async function Conteudo({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo: bruto } = await params;
  const codigo = bruto.toUpperCase();
  const [row] = codigoValido(codigo)
    ? await db
        .select({ c: certidoes, paroquia: paroquias.nome })
        .from(certidoes)
        .innerJoin(paroquias, eq(paroquias.id, certidoes.paroquiaId))
        .where(eq(certidoes.codigo, codigo))
    : [];

  if (!row) {
    return (
      <>
        <CardHeader>
          <CardTitle>Certidão não encontrada</CardTitle>
          <CardDescription>Confira o código impresso na certidão. Ele tem o formato XXXX-XXXX-XXXX.</CardDescription>
        </CardHeader>
      </>
    );
  }
  const { c } = row;
  const emitidaEm = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Manaus" }).format(c.emitidaEm);

  return (
    <>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Certidão {c.revogadaEm ? <Badge variant="destructive">REVOGADA</Badge> : <Badge>VÁLIDA</Badge>}
        </CardTitle>
        <CardDescription>{row.paroquia}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-muted-foreground">Tipo</dt>
          <dd>{NOMES_TIPO[c.tipoRegistro]}</dd>
          <dt className="text-muted-foreground">Nome</dt>
          <dd>{c.nomeRegistrado}</dd>
          <dt className="text-muted-foreground">Emitida em</dt>
          <dd>{emitidaEm}</dd>
          <dt className="text-muted-foreground">Código</dt>
          <dd>
            <code>{c.codigo}</code>
          </dd>
        </dl>
        {c.revogadaEm && <p className="mt-4 text-sm text-destructive">Esta certidão foi revogada e não tem valor.</p>}
      </CardContent>
    </>
  );
}

export default function Page({ params }: PageProps<"/validar/[codigo]">) {
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
