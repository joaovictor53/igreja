"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { comunidades } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { slugLivre, slugify } from "@/lib/slug";
import { normalizarMapaUrl, normalizarWhatsapp } from "@/lib/comunidade-contato";

/** `valores` devolve o que foi digitado quando a validação falha, porque o React limpa o formulário após cada envio. */
export type ComunidadeState = { erro?: string; ok?: boolean; valores?: Record<string, string> };

const digitado = (formData: FormData) =>
  Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;

const guard = () => requireParoquia("comunidades:gerir");
const refresh = () => {
  revalidatePath("/painel/comunidades");
  revalidatePath("/[slug]", "layout");
};

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da comunidade").max(120),
  endereco: z.string().trim().max(300),
  descricao: z.string().trim().max(2000),
  telefone: z.string().trim().max(40),
  whatsapp: z.string().trim().max(40).transform((v, ctx) => {
    const n = normalizarWhatsapp(v);
    if (n === null) ctx.addIssue({ code: "custom", message: "WhatsApp inválido: use DDD e número, ex.: (92) 99999-0000" });
    return n;
  }),
  mapaUrl: z.string().trim().max(500).transform((v, ctx) => {
    const n = normalizarMapaUrl(v);
    if (n === null) ctx.addIssue({ code: "custom", message: "Link do mapa inválido: cole um link https do Google Maps, Waze ou OpenStreetMap" });
    return n;
  }),
});

export async function criarComunidade(_: ComunidadeState, formData: FormData): Promise<ComunidadeState> {
  const { paroquia, user } = await guard();
  const d = schema.safeParse(Object.fromEntries(formData));
  if (!d.success) return { erro: d.error.issues[0].message, valores: digitado(formData) };
  const existentes = await db.select({ slug: comunidades.slug }).from(comunidades).where(eq(comunidades.paroquiaId, paroquia.id));
  await db.insert(comunidades).values({
    paroquiaId: paroquia.id,
    nome: d.data.nome,
    slug: slugLivre(slugify(d.data.nome), existentes.map((e) => e.slug)),
    endereco: d.data.endereco || null,
    descricao: d.data.descricao || null,
    telefone: d.data.telefone || null,
    whatsapp: d.data.whatsapp || null,
    mapaUrl: d.data.mapaUrl || null,
    createdBy: user.id,
  });
  refresh();
  return { ok: true };
}

export async function editarComunidade(_: ComunidadeState, formData: FormData): Promise<ComunidadeState> {
  const { paroquia } = await guard();
  const id = z.uuid().safeParse(formData.get("id"));
  const d = schema.safeParse(Object.fromEntries(formData));
  if (!id.success) return { erro: "Comunidade não encontrada" };
  if (!d.success) return { erro: d.error.issues[0].message, valores: digitado(formData) };
  await db
    .update(comunidades)
    .set({
      nome: d.data.nome,
      endereco: d.data.endereco || null,
      descricao: d.data.descricao || null,
      telefone: d.data.telefone || null,
      whatsapp: d.data.whatsapp || null,
      mapaUrl: d.data.mapaUrl || null,
      updatedAt: new Date(),
    })
    .where(and(eq(comunidades.id, id.data), eq(comunidades.paroquiaId, paroquia.id)));
  refresh();
  return { ok: true };
}

/** O banco recusa a exclusão se houver horários, celebrações, turmas ou datas ligados à comunidade. */
export async function excluirComunidade(_: ComunidadeState, formData: FormData): Promise<ComunidadeState> {
  const { paroquia } = await guard();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { erro: "Comunidade não encontrada" };
  try {
    await db.delete(comunidades).where(and(eq(comunidades.id, id.data), eq(comunidades.paroquiaId, paroquia.id)));
  } catch (e) {
    const codigo = (e as { code?: string; cause?: { code?: string } }).code ?? (e as { cause?: { code?: string } }).cause?.code;
    if (codigo === "23503") return { erro: "Esta comunidade já tem horários, celebrações, turmas ou datas ligados e não pode ser excluída." };
    throw e;
  }
  refresh();
  return { ok: true };
}
