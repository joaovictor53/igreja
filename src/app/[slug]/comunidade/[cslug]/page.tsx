import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { comunidades, paroquias } from "@/db/schema";
import { getComunidadePublica } from "@/server/modules/paroquia/publico";
import { formatarDataHora, lerRrule, NOMES_DIAS } from "@/lib/datas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export async function generateMetadata({ params }: PageProps<"/[slug]/comunidade/[cslug]">): Promise<Metadata> {
  const { slug, cslug } = await params;
  const [c] = await db
    .select({ nome: comunidades.nome, descricao: comunidades.descricao, paroquia: paroquias.nome })
    .from(comunidades)
    .innerJoin(paroquias, eq(paroquias.id, comunidades.paroquiaId))
    .where(and(eq(paroquias.slug, slug), eq(comunidades.slug, cslug)));
  if (!c) notFound();
  return {
    title: `${c.nome} — ${c.paroquia}`,
    description: c.descricao ?? `Horários de missa, festas e atividades — ${c.nome}, ${c.paroquia}`,
  };
}

const rotuloTipo = (tipo: string) => (tipo === "missa" ? "Missa" : tipo);
const hhmm = (h: number, m: number) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

async function Conteudo({ params }: { params: Promise<{ slug: string; cslug: string }> }) {
  const { slug, cslug } = await params;
  const dados = await getComunidadePublica(slug, cslug);
  if (!dados) notFound();
  const { paroquia, comunidade, horarios, celebracoes, eventos } = dados;

  const fixos = horarios
    .map((h) => ({ ...lerRrule(h.rrule), tipo: h.tipo, id: h.id }))
    .filter((h) => h.diaSemana >= 0)
    .sort((a, b) => a.diaSemana - b.diaSemana || a.hora - b.hora || a.minuto - b.minuto);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Church",
    name: comunidade.nome,
    parentOrganization: { "@type": "Organization", name: paroquia.nome },
    ...(comunidade.endereco && { address: comunidade.endereco }),
    ...(comunidade.telefone && { telephone: comunidade.telefone }),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className="mb-6">
        <p className="text-sm text-muted-foreground">
          <a className="underline" href={`/${paroquia.slug}`}>{paroquia.nome}</a>
        </p>
        {comunidade.fotoEm && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/comunidades/${comunidade.id}/foto?v=${encodeURIComponent(comunidade.fotoEm.toISOString())}`}
            alt={`Foto da comunidade ${comunidade.nome}`}
            className="mt-3 max-h-80 w-full rounded-xl border object-cover"
          />
        )}
        <h1 className="mt-3 text-3xl font-semibold">{comunidade.nome}</h1>
        {comunidade.descricao && <p className="mt-3 whitespace-pre-line">{comunidade.descricao}</p>}
        {(comunidade.endereco || comunidade.telefone) && (
          <p className="mt-3 text-sm text-muted-foreground">
            {comunidade.endereco}
            {comunidade.endereco && comunidade.telefone && " · "}
            {comunidade.telefone && <a className="underline" href={`tel:${comunidade.telefone.replace(/[^\d+]/g, "")}`}>{comunidade.telefone}</a>}
          </p>
        )}
        {(comunidade.whatsapp || comunidade.mapaUrl) && (
          <p className="mt-3 flex flex-wrap gap-3">
            {comunidade.whatsapp && (
              <a className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted" href={`https://wa.me/${comunidade.whatsapp}`} target="_blank" rel="noopener noreferrer">
                Falar no WhatsApp
              </a>
            )}
            {comunidade.mapaUrl && (
              <a className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted" href={comunidade.mapaUrl} target="_blank" rel="noopener noreferrer">
                Ver no mapa
              </a>
            )}
          </p>
        )}
      </header>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Horários fixos</CardTitle>
        </CardHeader>
        <CardContent>
          <ul>
            {fixos.map((h, i) => (
              <li key={h.id}>
                {i > 0 && <Separator className="my-2" />}
                {NOMES_DIAS[h.diaSemana]}, {hhmm(h.hora, h.minuto)} — {rotuloTipo(h.tipo)}
              </li>
            ))}
            {!fixos.length && <li>Horários ainda não divulgados.</li>}
          </ul>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Festas e atividades</CardTitle>
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
            {!eventos.length && <li>Nada programado por enquanto.</li>}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Próximas celebrações</CardTitle>
        </CardHeader>
        <CardContent>
          <ul>
            {celebracoes.map((c, i) => (
              <li key={c.id}>
                {i > 0 && <Separator className="my-2" />}
                {formatarDataHora(c.inicio, paroquia.fuso)} — {rotuloTipo(c.tipo)}
              </li>
            ))}
            {!celebracoes.length && <li>Nenhuma celebração programada.</li>}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}

export default function Page({ params }: PageProps<"/[slug]/comunidade/[cslug]">) {
  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <Suspense fallback={<p>Carregando…</p>}>
        <Conteudo params={params} />
      </Suspense>
    </main>
  );
}
