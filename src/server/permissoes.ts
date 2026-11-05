import "server-only";
import { cache } from "react";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { papeis } from "@/db/schema";
import {
  NOMES_PAPEL,
  comImplicitas,
  PAPEIS,
  ehPapelPadrao,
  permissoesPadrao,
  permissoesValidas,
  type Permissao,
} from "@/lib/permissoes";

/** Nome e permissões de um papel nesta paróquia: a linha em "papeis" se houver, senão o padrão. */
export const contextoDoPapel = cache(async (paroquiaId: string, papel: string) => {
  const nomePadrao = ehPapelPadrao(papel) ? NOMES_PAPEL[papel] : "Papel removido";
  // Administrador tem tudo, sempre: nenhuma edição pode trancar a paróquia fora.
  if (papel === "admin") return { nome: nomePadrao, permissoes: comImplicitas(permissoesPadrao("admin")) };
  const [row] = await db
    .select({ nome: papeis.nome, permissoes: papeis.permissoes })
    .from(papeis)
    .where(and(eq(papeis.paroquiaId, paroquiaId), eq(papeis.chave, papel)));
  if (row) return { nome: row.nome, permissoes: comImplicitas(permissoesValidas(row.permissoes)) };
  return { nome: nomePadrao, permissoes: comImplicitas(permissoesPadrao(papel)) };
});

/** Papéis que podem ser atribuídos na paróquia: o administrador, os de sistema (com o nome personalizado, se houver) e os criados por ela. */
export async function papeisDaParoquia(paroquiaId: string): Promise<{ chave: string; nome: string }[]> {
  const rows = await db.select({ chave: papeis.chave, nome: papeis.nome }).from(papeis).where(eq(papeis.paroquiaId, paroquiaId)).orderBy(asc(papeis.createdAt));
  const nomes = new Map(rows.map((r) => [r.chave, r.nome]));
  const sistema = PAPEIS.map((c) => ({ chave: c, nome: nomes.get(c) ?? NOMES_PAPEL[c] }));
  const criados = rows.filter((r) => !ehPapelPadrao(r.chave));
  return [...sistema, ...criados];
}

/** Chaves dos papéis da paróquia que têm a permissão; para filtrar membros no banco. */
export async function papeisComPermissao(paroquiaId: string, permissao: Permissao): Promise<string[]> {
  const rows = await db.select({ chave: papeis.chave, permissoes: papeis.permissoes }).from(papeis).where(eq(papeis.paroquiaId, paroquiaId));
  const personalizados = new Map(rows.map((r) => [r.chave, new Set(permissoesValidas(r.permissoes))]));
  const chaves = new Set<string>([...PAPEIS, ...personalizados.keys()]);
  return [...chaves].filter((c) =>
    c === "admin" ? true : (personalizados.get(c) ?? new Set(permissoesPadrao(c))).has(permissao),
  );
}
