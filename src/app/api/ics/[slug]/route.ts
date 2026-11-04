import { getParoquiaPublica } from "@/server/modules/paroquia/publico";

const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

export async function GET(_req: Request, ctx: RouteContext<"/api/ics/[slug]">) {
  const { slug } = await ctx.params;
  const dados = await getParoquiaPublica(slug);
  if (!dados) return new Response("Não encontrada", { status: 404 });

  const stamp = fmt(new Date());
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sistema Paroquial//PT-BR",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${esc(dados.paroquia.nome)}`,
    `X-WR-TIMEZONE:${dados.paroquia.fuso}`,
  ];
  for (const c of dados.celebracoes) {
    const fim = new Date(c.inicio.getTime() + 60 * 60 * 1000);
    linhas.push(
      "BEGIN:VEVENT",
      `UID:cel-${c.id}@sistema-paroquial`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${fmt(c.inicio)}`,
      `DTEND:${fmt(fim)}`,
      `SUMMARY:${esc(c.tipo === "missa" ? "Missa" : c.tipo)}`,
      `LOCATION:${esc(c.comunidade)}`,
      "END:VEVENT",
    );
  }
  for (const e of dados.eventos) {
    linhas.push(
      "BEGIN:VEVENT",
      `UID:ev-${e.id}@sistema-paroquial`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${fmt(e.inicio)}`,
      `DTEND:${fmt(e.fim ?? new Date(e.inicio.getTime() + 60 * 60 * 1000))}`,
      `SUMMARY:${esc(e.titulo)}`,
      ...(e.local ? [`LOCATION:${esc(e.local)}`] : []),
      "END:VEVENT",
    );
  }
  linhas.push("END:VCALENDAR");

  return new Response(linhas.join("\r\n") + "\r\n", {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "cache-control": "public, max-age=900",
    },
  });
}
