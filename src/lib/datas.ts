export const NOMES_DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const RRULE_DIAS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

/** Converte data/hora "de parede" em um fuso IANA para o instante UTC correspondente. */
export function zonedToUtc(y: number, m: number, d: number, h: number, min: number, tz: string): Date {
  const guess = Date.UTC(y, m - 1, d, h, min);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).formatToParts(new Date(guess));
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asLocal = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return new Date(guess - (asLocal - guess));
}

export function montarRrule(diaSemana: number, hora: number, minuto: number) {
  return `FREQ=WEEKLY;BYDAY=${RRULE_DIAS[diaSemana]};BYHOUR=${hora};BYMINUTE=${minuto}`;
}

export function lerRrule(rrule: string) {
  const p = Object.fromEntries(rrule.split(";").map((kv) => kv.split("=")));
  return { diaSemana: RRULE_DIAS.indexOf(p.BYDAY), hora: Number(p.BYHOUR), minuto: Number(p.BYMINUTE) };
}

/** Ocorrências semanais entre hoje e `meses` meses à frente, como instantes UTC. */
export function ocorrencias(rrule: string, tz: string, meses: number, desde = new Date()): Date[] {
  const { diaSemana, hora, minuto } = lerRrule(rrule);
  const fim = new Date(desde);
  fim.setUTCMonth(fim.getUTCMonth() + meses);
  const out: Date[] = [];
  const dia = new Date(Date.UTC(desde.getUTCFullYear(), desde.getUTCMonth(), desde.getUTCDate()));
  for (; dia <= fim; dia.setUTCDate(dia.getUTCDate() + 1)) {
    if (dia.getUTCDay() !== diaSemana) continue;
    const inicio = zonedToUtc(dia.getUTCFullYear(), dia.getUTCMonth() + 1, dia.getUTCDate(), hora, minuto, tz);
    if (inicio >= desde && inicio <= fim) out.push(inicio);
  }
  return out;
}

export function formatarDataHora(d: Date, tz: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
