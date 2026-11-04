"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { PAPEIS_ASSENTO, TIPOS_LIVRO, assentoPessoas, assentos, averbacoes, certidoes, livros } from "@/db/schema";
import { auditar } from "@/server/audit";
import { requireParoquia } from "@/server/auth/session";
import { gerarCodigo, hashCertidao, nomePrincipal, normalizar, textoCertidao, type DadosCertidao } from "@/lib/registros";

const PAPEIS = ["admin", "paroco", "secretaria"] as const;
const guard = () => requireParoquia([...PAPEIS]);
const MAX_LINHAS_PESSOAS = 8;

export type RegistroState = { erro?: string };

const codigoPg = (e: unknown) => (e as { code?: string; cause?: { code?: string } }).code ?? (e as { cause?: { code?: string } }).cause?.code;

export async function criarLivro(_: RegistroState, formData: FormData): Promise<RegistroState> {
  const { paroquia, user } = await guard();
  const parsed = z
    .object({
      tipo: z.enum(TIPOS_LIVRO),
      numero: z.coerce.number().int().min(1),
      inicio: z.string().optional(),
      fim: z.string().optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: "Informe o tipo e o número do livro" };
  const d = parsed.data;
  try {
    await db.transaction(async (tx) => {
      const [l] = await tx
        .insert(livros)
        .values({ paroquiaId: paroquia.id, tipo: d.tipo, numero: d.numero, inicio: d.inicio || null, fim: d.fim || null, createdBy: user.id })
        .returning({ id: livros.id });
      await auditar(tx, { paroquiaId: paroquia.id, usuarioId: user.id, tabela: "livros", registroId: l.id, acao: "criar", depois: { tipo: d.tipo, numero: d.numero } });
    });
  } catch (e) {
    if (codigoPg(e) === "23505") return { erro: "Já existe um livro deste tipo com este número" };
    throw e;
  }
  revalidatePath("/painel/registros");
  return {};
}

/** As pessoas vêm em linhas pessoa_papel_N / pessoa_nome_N; linhas sem nome são ignoradas. */
function lerPessoas(formData: FormData) {
  const pessoas: { papel: (typeof PAPEIS_ASSENTO)[number]; nome: string }[] = [];
  for (let i = 0; i < MAX_LINHAS_PESSOAS; i++) {
    const nome = String(formData.get(`pessoa_nome_${i}`) ?? "").trim();
    if (!nome) continue;
    const papel = z.enum(PAPEIS_ASSENTO).parse(formData.get(`pessoa_papel_${i}`));
    pessoas.push({ papel, nome: nome.slice(0, 200) });
  }
  return pessoas;
}

export async function criarAssento(_: RegistroState, formData: FormData): Promise<RegistroState> {
  const { paroquia, user } = await guard();
  const parsed = z
    .object({
      livroId: z.uuid(),
      folha: z.string().trim().min(1, "Informe a folha").max(20),
      termo: z.string().trim().min(1, "Informe o termo").max(20),
      data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data"),
      celebrante: z.string().trim().max(200).optional(),
      observacoes: z.string().trim().max(2000).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };
  const d = parsed.data;
  const pessoas = lerPessoas(formData);
  if (!pessoas.some((p) => p.papel === "principal")) return { erro: "Informe a pessoa registrada" };

  const [livro] = await db
    .select({ id: livros.id })
    .from(livros)
    .where(and(eq(livros.id, d.livroId), eq(livros.paroquiaId, paroquia.id)));
  if (!livro) return { erro: "Livro inválido" };

  let assentoId: string;
  try {
    assentoId = await db.transaction(async (tx) => {
      const [a] = await tx
        .insert(assentos)
        .values({
          paroquiaId: paroquia.id,
          livroId: livro.id,
          folha: d.folha,
          termo: d.termo,
          data: d.data,
          celebrante: d.celebrante || null,
          observacoes: d.observacoes || null,
          textoBusca: pessoas.map((p) => normalizar(p.nome)).join(" | "),
          createdBy: user.id,
        })
        .returning({ id: assentos.id });
      await tx.insert(assentoPessoas).values(pessoas.map((p) => ({ ...p, assentoId: a.id, paroquiaId: paroquia.id, createdBy: user.id })));
      await auditar(tx, {
        paroquiaId: paroquia.id,
        usuarioId: user.id,
        tabela: "assentos",
        registroId: a.id,
        acao: "criar",
        depois: { livroId: livro.id, folha: d.folha, termo: d.termo, data: d.data, celebrante: d.celebrante || null, pessoas },
      });
      return a.id;
    });
  } catch (e) {
    if (codigoPg(e) === "23505") return { erro: "Já existe um assento com esta folha e termo neste livro" };
    throw e;
  }
  redirect(`/painel/registros/assentos/${assentoId}`);
}

export async function adicionarAverbacao(formData: FormData) {
  const { paroquia, user } = await guard();
  const d = z
    .object({
      assentoId: z.uuid(),
      data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      texto: z.string().trim().min(3).max(1000),
    })
    .parse(Object.fromEntries(formData));
  const [a] = await db
    .select({ id: assentos.id })
    .from(assentos)
    .where(and(eq(assentos.id, d.assentoId), eq(assentos.paroquiaId, paroquia.id)));
  if (!a) throw new Error("Assento não encontrado");
  await db.transaction(async (tx) => {
    const [v] = await tx
      .insert(averbacoes)
      .values({ ...d, paroquiaId: paroquia.id, createdBy: user.id })
      .returning({ id: averbacoes.id });
    await auditar(tx, { paroquiaId: paroquia.id, usuarioId: user.id, tabela: "averbacoes", registroId: v.id, acao: "criar", depois: { assentoId: a.id, data: d.data, texto: d.texto } });
  });
  revalidatePath(`/painel/registros/assentos/${a.id}`);
}

/** Emite a certidão guardando um retrato do conteúdo; o PDF é sempre gerado a partir dele. */
export async function emitirCertidao(formData: FormData) {
  const { paroquia, user } = await guard();
  const d = z
    .object({ assentoId: z.uuid(), finalidade: z.string().trim().max(200).optional() })
    .parse(Object.fromEntries(formData));

  const [row] = await db
    .select({ a: assentos, livro: livros })
    .from(assentos)
    .innerJoin(livros, eq(livros.id, assentos.livroId))
    .where(and(eq(assentos.id, d.assentoId), eq(assentos.paroquiaId, paroquia.id)));
  if (!row) throw new Error("Assento não encontrado");

  const [pessoas, avs] = await Promise.all([
    db.select().from(assentoPessoas).where(eq(assentoPessoas.assentoId, row.a.id)),
    db.select().from(averbacoes).where(eq(averbacoes.assentoId, row.a.id)),
  ]);
  const dados: DadosCertidao = {
    tipo: row.livro.tipo,
    livro: row.livro.numero,
    folha: row.a.folha,
    termo: row.a.termo,
    data: row.a.data,
    celebrante: row.a.celebrante,
    paroquia: paroquia.nome,
    pessoas: pessoas.map((p) => ({ papel: p.papel, nome: p.nome })),
    averbacoes: avs.sort((x, y) => x.data.localeCompare(y.data)).map((a) => ({ data: a.data, texto: a.texto })),
  };
  const paragrafos = textoCertidao(dados);

  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const codigo = gerarCodigo();
    const emitidaEm = new Date();
    try {
      await db.transaction(async (tx) => {
        const [cert] = await tx
          .insert(certidoes)
          .values({
            paroquiaId: paroquia.id,
            assentoId: row.a.id,
            codigo,
            emitidaEm,
            emitidaPor: user.id,
            finalidade: d.finalidade || null,
            tipoRegistro: row.livro.tipo,
            nomeRegistrado: nomePrincipal(dados.pessoas, dados.tipo),
            paragrafos,
            hashConteudo: hashCertidao(paragrafos, codigo, emitidaEm),
            createdBy: user.id,
          })
          .returning({ id: certidoes.id });
        await auditar(tx, {
          paroquiaId: paroquia.id,
          usuarioId: user.id,
          tabela: "certidoes",
          registroId: cert.id,
          acao: "emitir",
          depois: { codigo, assentoId: row.a.id, finalidade: d.finalidade || null },
        });
      });
      revalidatePath(`/painel/registros/assentos/${row.a.id}`);
      return;
    } catch (e) {
      if (codigoPg(e) !== "23505") throw e; // só repete se o código colidiu
    }
  }
  throw new Error("Não foi possível gerar um código único");
}

export async function revogarCertidao(formData: FormData) {
  const { paroquia, user } = await guard();
  const d = z.object({ id: z.uuid(), motivo: z.string().trim().min(3, "Informe o motivo").max(300) }).parse(Object.fromEntries(formData));
  const c = await db.transaction(async (tx) => {
    const [atual] = await tx
      .select({ assentoId: certidoes.assentoId, codigo: certidoes.codigo, revogadaEm: certidoes.revogadaEm })
      .from(certidoes)
      .where(and(eq(certidoes.id, d.id), eq(certidoes.paroquiaId, paroquia.id)));
    if (!atual || atual.revogadaEm) return null; // já revogada: não duplica o registro
    await tx.update(certidoes).set({ revogadaEm: new Date(), motivoRevogacao: d.motivo, updatedAt: new Date() }).where(eq(certidoes.id, d.id));
    await auditar(tx, {
      paroquiaId: paroquia.id,
      usuarioId: user.id,
      tabela: "certidoes",
      registroId: d.id,
      acao: "revogar",
      antes: { codigo: atual.codigo, revogada: false },
      depois: { revogada: true, motivo: d.motivo },
    });
    return atual;
  });
  if (c) revalidatePath(`/painel/registros/assentos/${c.assentoId}`);
}
