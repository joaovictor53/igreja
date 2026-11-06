/** "Capela São José" → "capela-sao-jose". Vazio se não sobrar nenhum caractere útil. */
export function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

/** Devolve `base` ou `base-2`, `base-3`… o primeiro que não esteja em `usados`. */
export function slugLivre(base: string, usados: Iterable<string>): string {
  const set = new Set(usados);
  const raiz = base || "comunidade";
  if (!set.has(raiz)) return raiz;
  for (let n = 2; ; n++) if (!set.has(`${raiz}-${n}`)) return `${raiz}-${n}`;
}
