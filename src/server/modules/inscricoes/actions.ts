"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { formularios, pessoas, respostas } from "@/db/schema";
import { auditar } from "@/server/audit";
import { requireParoquia } from "@/server/auth/session";
import { excedeuLimite } from "@/lib/rate-limit";
import { MODELOS, TIPOS_CAMPO, idDoCampo, validarResposta, type Campo, type TipoCampo } from "@/lib/formularios";
import { zonedToUtc } from "@/lib/datas";

const PAPEIS = ["admin", "paroco", "secretaria"] as const;
const guard = () => requireParoquia([...PAPEIS]);
const refresh = (id?: string) => {
  revalidatePath("/painel/inscricoes");
  if (id) revalidatePath(`/painel/inscricoes/${id}`);
};

async function formularioDaParoquia(id: string, paroquiaId: string) {
  const [f] = await db.select().from(formularios).where(and(eq(formularios.id, id), eq(formularios.paroquiaId, paroquiaId)));
  if (!f) throw new Error("Formulário não encontrado");
  return f;
}

export async function criarFormulario(formData: FormData) {
  const { paroquia, user } = await guard();
  const d = z.object({ modelo: z.string(), titulo: z.string().trim().optional() }).parse(Object.fromEntries(formData));
  const modelo = MODELOS[d.modelo];
  if (!modelo) throw new Error("Modelo inválido");
  await db.insert(formularios).values({
    paroquiaId: paroquia.id,
    titulo: d.titulo || modelo.titulo,
    campos: modelo.campos,
    modeloOrigem: d.modelo,
    createdBy: user.id,
  });
  refresh();
}

export type CampoState = { erro?: string };

export async function adicionarCampo(_: CampoState, formData: FormData): Promise<CampoState> {
  const { paroquia } = await guard();
  const d = z
    .object({
      formularioId: z.uuid(),
      rotulo: z.string().trim().min(2).max(120),
      tipo: z.enum(Object.keys(TIPOS_CAMPO) as [TipoCampo, ...TipoCampo[]]),
      opcoes: z.string().optional(),
      obrigatorio: z.string().optional(),
    })
    .parse(Object.fromEntries(formData));
  const f = await formularioDaParoquia(d.formularioId, paroquia.id);
  const comOpcoes = d.tipo === "escolha_unica" || d.tipo === "escolha_multipla";
  const opcoes = (d.opcoes ?? "").split("\n").map((o) => o.trim()).filter(Boolean).slice(0, 30);
  if (comOpcoes && opcoes.length < 2) return { erro: "Para escolha única ou múltipla, informe ao menos 2 opções, uma por linha." };
  const campo: Campo = {
    id: idDoCampo(d.rotulo, f.campos.map((c) => c.id)),
    rotulo: d.rotulo,
    tipo: d.tipo,
    obrigatorio: d.obrigatorio === "on",
    ...(comOpcoes ? { opcoes } : {}),
  };
  await db.update(formularios).set({ campos: [...f.campos, campo], updatedAt: new Date() }).where(eq(formularios.id, f.id));
  refresh(f.id);
  return {};
}

export async function removerCampo(formData: FormData) {
  const { paroquia } = await guard();
  const d = z.object({ formularioId: z.uuid(), campoId: z.string() }).parse(Object.fromEntries(formData));
  const f = await formularioDaParoquia(d.formularioId, paroquia.id);
  await db
    .update(formularios)
    .set({ campos: f.campos.filter((c) => c.id !== d.campoId), updatedAt: new Date() })
    .where(eq(formularios.id, f.id));
  refresh(f.id);
}

/** Datas e hora são interpretadas no fuso da paróquia. */
export async function atualizarConfig(formData: FormData) {
  const { paroquia } = await guard();
  const d = z
    .object({
      formularioId: z.uuid(),
      limite: z.string().optional(),
      abreEm: z.string().optional(),
      fechaEm: z.string().optional(),
      ativo: z.string().optional(),
    })
    .parse(Object.fromEntries(formData));
  const f = await formularioDaParoquia(d.formularioId, paroquia.id);
  const data = (v?: string) => {
    if (!v) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(v);
    if (!m) throw new Error("Data inválida");
    return zonedToUtc(+m[1], +m[2], +m[3], +m[4], +m[5], paroquia.fuso);
  };
  const limite = d.limite ? z.coerce.number().int().min(1).parse(d.limite) : null;
  await db
    .update(formularios)
    .set({ limite, abreEm: data(d.abreEm), fechaEm: data(d.fechaEm), ativo: d.ativo === "on", updatedAt: new Date() })
    .where(eq(formularios.id, f.id));
  refresh(f.id);
}

export async function alterarStatusResposta(formData: FormData) {
  const { paroquia } = await guard();
  const d = z
    .object({ id: z.uuid(), status: z.enum(["nova", "em_analise", "aceita", "recusada"]) })
    .parse(Object.fromEntries(formData));
  const [r] = await db
    .update(respostas)
    .set({ status: d.status, updatedAt: new Date() })
    .where(and(eq(respostas.id, d.id), eq(respostas.paroquiaId, paroquia.id)))
    .returning({ formularioId: respostas.formularioId });
  if (r) refresh(r.formularioId);
}

/** Cria o cadastro de pessoa a partir de uma resposta (usa os campos nome, telefone, email e nascimento). */
export async function converterEmPessoa(formData: FormData) {
  const { paroquia, user } = await guard();
  const id = z.uuid().parse(formData.get("id"));
  const [r] = await db.select().from(respostas).where(and(eq(respostas.id, id), eq(respostas.paroquiaId, paroquia.id)));
  if (!r || r.pessoaId) return;
  const texto = (k: string) => (typeof r.dados[k] === "string" ? (r.dados[k] as string) : null);
  const nome = texto("nome");
  if (!nome) throw new Error("A resposta não tem o campo nome");
  const nomeBusca = nome.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  await db.transaction(async (tx) => {
    const [p] = await tx
      .insert(pessoas)
      .values({
        paroquiaId: paroquia.id,
        nome,
        nomeBusca,
        telefone: texto("telefone"),
        email: texto("email"),
        nascimento: texto("nascimento"),
        createdBy: user.id,
      })
      .returning({ id: pessoas.id });
    await tx.update(respostas).set({ pessoaId: p.id, updatedAt: new Date() }).where(eq(respostas.id, r.id));
    await auditar(tx, { paroquiaId: paroquia.id, usuarioId: user.id, tabela: "pessoas", registroId: p.id, acao: "criar", depois: { nome, origem: `resposta ${r.id}` } });
    await auditar(tx, { paroquiaId: paroquia.id, usuarioId: user.id, tabela: "respostas", registroId: r.id, acao: "vincular", antes: { pessoaId: null }, depois: { pessoaId: p.id } });
  });
  refresh(r.formularioId);
  revalidatePath("/painel/pessoas");
}

export type EnvioState = { erro?: string; ok?: boolean };

/** Ação pública (sem login): tudo é validado no servidor contra a definição do formulário. */
export async function enviarResposta(_: EnvioState, formData: FormData): Promise<EnvioState> {
  // honeypot: robôs preenchem; fingimos sucesso para não dar pista
  if (String(formData.get("website_url") ?? "")) return { ok: true };
  if (await excedeuLimite("form")) return { erro: "Muitas tentativas. Aguarde um minuto." };

  const formularioId = z.uuid().safeParse(formData.get("formularioId"));
  if (!formularioId.success) return { erro: "Formulário inválido" };
  const [f] = await db.select().from(formularios).where(eq(formularios.id, formularioId.data));
  if (!f || !f.ativo) return { erro: "Inscrições encerradas" };
  const agora = new Date();
  if ((f.abreEm && agora < f.abreEm) || (f.fechaEm && agora > f.fechaEm)) return { erro: "Fora do período de inscrições" };

  const v = validarResposta(f.campos, formData);
  if (!v.ok) return { erro: v.erro };

  // checa o limite de vagas e grava na mesma transação
  const erro = await db.transaction(async (tx) => {
    if (f.limite) {
      const [{ total }] = await tx
        .select({ total: count() })
        .from(respostas)
        .where(and(eq(respostas.formularioId, f.id), ne(respostas.status, "recusada")));
      if (total >= f.limite) return "Vagas esgotadas";
    }
    await tx.insert(respostas).values({ paroquiaId: f.paroquiaId, formularioId: f.id, dados: v.dados });
    return null;
  });
  if (erro) return { erro };
  revalidatePath(`/painel/inscricoes/${f.id}`);
  return { ok: true };
}
