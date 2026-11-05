// Sem dependências de servidor: usado nas ações e no envio.

const SERVICOS_PUSH = [
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "push.services.mozilla.com",
  "notify.windows.com",
  "push.apple.com",
];

/**
 * O servidor faz POST no endpoint da inscrição, então ele precisa ser de um serviço de push
 * conhecido dos navegadores. Sem isto, qualquer usuário faria o servidor chamar um endereço qualquer.
 */
export function endpointPushPermitido(valor: string): boolean {
  let url: URL;
  try {
    url = new URL(valor);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.port || url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  return SERVICOS_PUSH.some((s) => host === s || host.endsWith("." + s));
}
