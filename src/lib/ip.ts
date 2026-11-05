// Sem dependências de servidor: usado pelo limite de tentativas e pelos testes.

/**
 * IP do cliente a partir do x-forwarded-for. Cada proxy confiável acrescenta o IP que viu à direita,
 * então o valor confiável é o `saltos`-ésimo contando do fim. O que está à esquerda vem do cliente e pode ser forjado.
 */
export function ipDoCliente(xff: string | null, saltos = 1): string {
  const partes = (xff ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  if (!partes.length) return "local";
  return partes[Math.max(0, partes.length - Math.max(1, saltos))];
}
