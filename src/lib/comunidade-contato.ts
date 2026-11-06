/** Só dígitos com DDI; aceita "(92) 99999-0000", "+55 92 99999-0000". Vazio = sem WhatsApp, null = inválido. */
export function normalizarWhatsapp(texto: string): string | null | "" {
  const digitos = texto.replace(/\D/g, "");
  if (!digitos) return "";
  const internacional = texto.trim().startsWith("+");
  const comDdi = !internacional && (digitos.length === 10 || digitos.length === 11) ? `55${digitos}` : digitos;
  return /^55\d{10,11}$/.test(comDdi) ? comDdi : null;
}

const HOSTS_MAPA = ["google.com", "www.google.com", "maps.google.com", "maps.app.goo.gl", "goo.gl", "www.openstreetmap.org", "openstreetmap.org", "waze.com", "www.waze.com", "ul.waze.com"];

/** Aceita só links https de serviços de mapa conhecidos. Vazio = sem mapa, null = inválido. */
export function normalizarMapaUrl(texto: string): string | null | "" {
  const t = texto.trim();
  if (!t) return "";
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || !HOSTS_MAPA.includes(u.hostname)) return null;
  if ((u.hostname === "google.com" || u.hostname === "www.google.com") && !u.pathname.startsWith("/maps")) return null;
  return u.toString();
}

export const FOTO_MAX_BYTES = 2 * 1024 * 1024;

/** Identifica a imagem pelos primeiros bytes (não confia no tipo enviado pelo navegador). SVG é recusado de propósito. */
export function tipoDeImagem(b: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 12 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  const txt = (i: number, n: number) => String.fromCharCode(...b.slice(i, i + n));
  if (b.length > 12 && txt(0, 4) === "RIFF" && txt(8, 4) === "WEBP") return "image/webp";
  return null;
}
