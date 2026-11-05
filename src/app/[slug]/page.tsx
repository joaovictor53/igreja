import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { paroquias } from "@/db/schema";
import { getParoquiaPublica } from "@/server/modules/paroquia/publico";
import { formatarDataHora } from "@/lib/datas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [p] = await db.select({ nome: paroquias.nome }).from(paroquias).where(eq(paroquias.slug, slug));
  if (!p) notFound();
  return {
    title: p.nome,
    description: `Horários de missa, agenda e contatos — ${p.nome}`,
    openGraph: { title: p.nome, type: "website" },
  };
}

async function Conteudo({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dados = await getParoquiaPublica(slug);
  if (!dados) notFound();
  const { paroquia, comunidades, celebracoes, eventos, formularios } = dados;
  const origem = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const url = `${origem}/${paroquia.slug}`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 1, width: 160 });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Church",
    name: paroquia.nome,
    url,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{paroquia.nome}</h1>
          {comunidades.length > 0 && <p className="mt-1">Comunidades: {comunidades.map((c) => c.nome).join(", ")}</p>}
          <p className="mt-3">
            <a className="underline" href={`/api/ics/${paroquia.slug}`}>Assinar agenda no celular (.ics)</a>
            {" · "}
            <a className="underline" href={`/${paroquia.slug}/pedido`}>Fazer um pedido pastoral</a>
          </p>
        </div>
        <div role="img" aria-label={`QR Code para ${url}`} dangerouslySetInnerHTML={{ __html: qr }} />
      </header>

      {formularios.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Inscrições abertas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul>
              {formularios.map((f) => (
                <li key={f.id}>
                  <a className="underline" href={`/f/${f.id}`}>{f.titulo}</a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Próximas celebrações</CardTitle>
        </CardHeader>
        <CardContent>
          <ul>
            {celebracoes.slice(0, 20).map((c, i) => (
              <li key={c.id}>
                {i > 0 && <Separator className="my-2" />}
                {formatarDataHora(c.inicio, paroquia.fuso)} — {c.tipo === "missa" ? "Missa" : c.tipo} — {c.comunidade}
              </li>
            ))}
            {!celebracoes.length && <li>Nenhuma celebração programada.</li>}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agenda</CardTitle>
        </CardHeader>
        <CardContent>
          <ul>
            {eventos.map((e, i) => (
              <li key={e.id}>
                {i > 0 && <Separator className="my-2" />}
                {formatarDataHora(e.inicio, paroquia.fuso)} — {e.titulo}
                {e.local && <span> ({e.local})</span>}
              </li>
            ))}
            {!eventos.length && <li>Nenhum evento programado.</li>}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}

export default function Page({ params }: PageProps<"/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <Suspense fallback={<p>Carregando…</p>}>
        <Conteudo params={params} />
      </Suspense>
    </main>
  );
}
