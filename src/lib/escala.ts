export type CelebracaoEscala = { id: string; inicio: Date };
export type FuncaoEscala = { id: string; vagas: number; membros: string[] };
export type ItemEscala = { celebracaoId: string; funcaoId: string; pessoaId: string | null };

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Distribui membros nas vagas de cada celebração (ordem cronológica).
 * Candidatos: menos escalas no mês → escalado há mais tempo → sorteio com seed fixa.
 * Ninguém repete na mesma celebração nem no mesmo dia (UTC) e respeita `maxPorMes`.
 * Vagas sem candidato ficam com `pessoaId: null` para o coordenador completar.
 */
export function gerarEscala(
  celebracoes: CelebracaoEscala[],
  funcoes: FuncaoEscala[],
  opcoes: { maxPorMes?: number; seed?: number } = {},
): ItemEscala[] {
  const { maxPorMes = 4, seed = 1 } = opcoes;
  const rand = mulberry32(seed);
  const total = new Map<string, number>();
  const ultima = new Map<string, number>();
  const diasUsados = new Map<string, Set<string>>();
  const itens: ItemEscala[] = [];

  const ordenadas = [...celebracoes].sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  for (const cel of ordenadas) {
    const dia = cel.inicio.toISOString().slice(0, 10);
    for (const funcao of funcoes) {
      for (let v = 0; v < funcao.vagas; v++) {
        const candidatos = funcao.membros
          .filter((p) => (total.get(p) ?? 0) < maxPorMes && !diasUsados.get(p)?.has(dia) && !itens.some((i) => i.celebracaoId === cel.id && i.pessoaId === p))
          .map((p) => ({ p, n: total.get(p) ?? 0, ult: ultima.get(p) ?? -Infinity, r: rand() }))
          .sort((a, b) => a.n - b.n || a.ult - b.ult || a.r - b.r);
        const escolhido = candidatos[0]?.p ?? null;
        if (escolhido) {
          total.set(escolhido, (total.get(escolhido) ?? 0) + 1);
          ultima.set(escolhido, cel.inicio.getTime());
          if (!diasUsados.has(escolhido)) diasUsados.set(escolhido, new Set());
          diasUsados.get(escolhido)!.add(dia);
        }
        itens.push({ celebracaoId: cel.id, funcaoId: funcao.id, pessoaId: escolhido });
      }
    }
  }
  return itens;
}
