import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { CalendarDaysIcon, ClockIcon, MapPinIcon, MessageCircleIcon, NavigationIcon, PhoneIcon } from "lucide-react";
import { db } from "@/db";
import { comunidades, paroquias } from "@/db/schema";
import { getComunidadePublica } from "@/server/modules/paroquia/publico";
import { lerRrule, NOMES_DIAS } from "@/lib/datas";

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

const ROTULOS_TIPO: Record<string, string> = { missa: "Missa", confissao: "Confissão" };
const rotuloTipo = (tipo: string) => ROTULOS_TIPO[tipo] ?? tipo;
const hhmm = (h: number, m: number) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

/** Dia, mês abreviado, dia da semana e hora no fuso da paróquia, para o "calendário" de cada item. */
function partes(d: Date, tz: string) {
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", { timeZone: tz, ...o }).format(d).replace(".", "");
  return {
    dia: f({ day: "2-digit" }),
    mes: f({ month: "short" }),
    semana: f({ weekday: "long" }),
    hora: f({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
  };
}

function Data({ d, tz }: { d: Date; tz: string }) {
  const p = partes(d, tz);
  return (
    <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden>
      <span className="text-xl leading-none font-semibold">{p.dia}</span>
      <span className="text-xs uppercase">{p.mes}</span>
    </div>
  );
}

function Secao({ id, titulo, icone, children }: { id: string; titulo: string; icone: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="scroll-mt-16 py-8">
      <h2 id={`${id}-titulo`} className="mb-4 flex items-center gap-2 text-xl font-semibold">
        <span className="text-primary">{icone}</span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

const botao = "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

async function Conteudo({ params }: { params: Promise<{ slug: string; cslug: string }> }) {
  const { slug, cslug } = await params;
  const dados = await getComunidadePublica(slug, cslug);
  if (!dados) notFound();
  const { paroquia, comunidade, horarios, celebracoes, eventos } = dados;
  const tz = paroquia.fuso;
  const telefoneLimpo = comunidade.telefone?.replace(/[^\d+]/g, "");
  const temContato = !!(comunidade.endereco || comunidade.telefone || comunidade.whatsapp || comunidade.mapaUrl);

  // horários fixos agrupados por dia da semana
  const porDia = new Map<number, { id: string; hora: string; tipo: string }[]>();
  for (const h of horarios) {
    const l = lerRrule(h.rrule);
    if (l.diaSemana < 0) continue;
    porDia.set(l.diaSemana, [...(porDia.get(l.diaSemana) ?? []), { id: h.id, hora: hhmm(l.hora, l.minuto), tipo: h.tipo }]);
  }
  const dias = [...porDia.entries()].sort(([a], [b]) => a - b).map(([d, itens]) => [d, itens.sort((a, b) => a.hora.localeCompare(b.hora))] as const);

  const links = [
    comunidade.descricao && { href: "#sobre", rotulo: "Sobre" },
    { href: "#horarios", rotulo: "Horários" },
    { href: "#agenda", rotulo: "Festas e atividades" },
    temContato && { href: "#contato", rotulo: "Contato" },
  ].filter((l): l is { href: string; rotulo: string } => !!l);

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

      <header className={`relative isolate flex min-h-72 items-end overflow-hidden sm:min-h-96 ${comunidade.fotoEm ? "text-white" : "bg-gradient-to-br from-primary to-primary/60 text-primary-foreground"}`}>
        {comunidade.fotoEm && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/comunidades/${comunidade.id}/foto?v=${encodeURIComponent(comunidade.fotoEm.toISOString())}`}
              alt={`Foto da comunidade ${comunidade.nome}`}
              className="absolute inset-0 -z-10 size-full object-cover"
            />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/30 to-black/10" aria-hidden />
          </>
        )}
        <div className="mx-auto w-full max-w-4xl px-4 pt-16 pb-8 sm:px-6">
          <a className="text-sm underline-offset-4 opacity-90 hover:underline" href={`/${paroquia.slug}`}>{paroquia.nome}</a>
          <h1 className="mt-1 text-3xl font-bold text-balance sm:text-5xl">{comunidade.nome}</h1>
          {comunidade.endereco && <p className="mt-2 flex items-start gap-1.5 opacity-90"><MapPinIcon className="mt-1 size-4 shrink-0" />{comunidade.endereco}</p>}
          {(comunidade.whatsapp || comunidade.mapaUrl || telefoneLimpo) && (
            <div className="mt-5 flex flex-wrap gap-2">
              {comunidade.whatsapp && (
                <a className={`${botao} bg-white text-neutral-900 hover:bg-white/90`} href={`https://wa.me/${comunidade.whatsapp}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircleIcon className="size-4" />Falar no WhatsApp
                </a>
              )}
              {comunidade.mapaUrl && (
                <a className={`${botao} border border-current/40 bg-black/20 backdrop-blur hover:bg-black/30`} href={comunidade.mapaUrl} target="_blank" rel="noopener noreferrer">
                  <NavigationIcon className="size-4" />Como chegar
                </a>
              )}
              {telefoneLimpo && (
                <a className={`${botao} border border-current/40 bg-black/20 backdrop-blur hover:bg-black/30`} href={`tel:${telefoneLimpo}`}>
                  <PhoneIcon className="size-4" />Ligar
                </a>
              )}
            </div>
          )}
        </div>
      </header>

      <nav aria-label="Seções da página" className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <ul className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-2 py-2 sm:px-4">
          {links.map((l) => (
            <li key={l.href} className="shrink-0">
              <a className="block rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" href={l.href}>
                {l.rotulo}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mx-auto w-full max-w-4xl divide-y px-4 sm:px-6">
        {comunidade.descricao && (
          <Secao id="sobre" titulo="Sobre a comunidade" icone={<MapPinIcon className="size-5" />}>
            <p className="max-w-prose whitespace-pre-line">{comunidade.descricao}</p>
          </Secao>
        )}

        <Secao id="horarios" titulo="Horários" icone={<ClockIcon className="size-5" />}>
          {dias.length > 0 ? (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dias.map(([d, itens]) => (
                <li key={d} className="rounded-xl border bg-card p-4 text-card-foreground">
                  <h3 className="font-semibold">{NOMES_DIAS[d]}</h3>
                  <ul className="mt-2 space-y-1">
                    {itens.map((i) => (
                      <li key={i.id} className="flex items-baseline justify-between gap-3">
                        <span className="text-muted-foreground">{rotuloTipo(i.tipo)}</span>
                        <span className="text-lg font-medium tabular-nums">{i.hora}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Horários ainda não divulgados.</p>
          )}

          {celebracoes.length > 0 && (
            <>
              <h3 className="mt-8 mb-3 font-semibold">Próximas celebrações</h3>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {celebracoes.slice(0, 6).map((c) => {
                  const p = partes(c.inicio, tz);
                  return (
                    <li key={c.id} className="flex items-center gap-3 rounded-xl border p-3">
                      <Data d={c.inicio} tz={tz} />
                      <div>
                        <p className="font-medium">{rotuloTipo(c.tipo)}</p>
                        <p className="text-sm text-muted-foreground capitalize">{p.semana}, {p.hora}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Secao>

        <Secao id="agenda" titulo="Festas e atividades" icone={<CalendarDaysIcon className="size-5" />}>
          {eventos.length > 0 ? (
            <ul className="space-y-3">
              {eventos.map((e) => {
                const p = partes(e.inicio, tz);
                return (
                  <li key={e.id} className="flex items-center gap-4 rounded-xl border bg-card p-3 text-card-foreground">
                    <Data d={e.inicio} tz={tz} />
                    <div className="min-w-0">
                      <p className="font-medium break-words">{e.titulo}</p>
                      <p className="text-sm text-muted-foreground">
                        <span className="capitalize">{p.semana}</span>, {p.hora}
                        {e.local && ` · ${e.local}`}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-muted-foreground">Nada programado por enquanto. Volte em breve!</p>
          )}
        </Secao>

        {temContato && (
          <Secao id="contato" titulo="Contato e localização" icone={<PhoneIcon className="size-5" />}>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {comunidade.endereco && (
                <div>
                  <dt className="text-sm text-muted-foreground">Endereço</dt>
                  <dd>{comunidade.endereco}</dd>
                </div>
              )}
              {comunidade.telefone && (
                <div>
                  <dt className="text-sm text-muted-foreground">Telefone</dt>
                  <dd><a className="underline" href={`tel:${telefoneLimpo}`}>{comunidade.telefone}</a></dd>
                </div>
              )}
              {comunidade.whatsapp && (
                <div>
                  <dt className="text-sm text-muted-foreground">WhatsApp</dt>
                  <dd><a className="underline" href={`https://wa.me/${comunidade.whatsapp}`} target="_blank" rel="noopener noreferrer">Enviar mensagem</a></dd>
                </div>
              )}
              {comunidade.mapaUrl && (
                <div>
                  <dt className="text-sm text-muted-foreground">Mapa</dt>
                  <dd><a className="underline" href={comunidade.mapaUrl} target="_blank" rel="noopener noreferrer">Abrir no mapa</a></dd>
                </div>
              )}
            </dl>
          </Secao>
        )}
      </div>

      <footer className="mt-8 border-t bg-muted/40">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:px-6">
          <p>
            {comunidade.nome} faz parte da <a className="underline" href={`/${paroquia.slug}`}>{paroquia.nome}</a>.
          </p>
          <p className="flex gap-4">
            <a className="underline" href={`/${paroquia.slug}/pedido`}>Fazer um pedido pastoral</a>
            <a className="underline" href={`/api/ics/${paroquia.slug}`}>Agenda no celular</a>
          </p>
        </div>
      </footer>
    </>
  );
}

export default function Page({ params }: PageProps<"/[slug]/comunidade/[cslug]">) {
  return (
    <main className="min-h-dvh w-full min-w-0">
      <Suspense fallback={<p className="p-6">Carregando…</p>}>
        <Conteudo params={params} />
      </Suspense>
    </main>
  );
}
