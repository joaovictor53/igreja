/** Aceita só caminhos internos (evita open redirect via ?next=). */
export function caminhoSeguro(next: string | null | undefined, padrao = "/painel") {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : padrao;
}
