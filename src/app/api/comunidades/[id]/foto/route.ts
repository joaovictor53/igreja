import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { comunidadeFotos, comunidades, membrosParoquia } from "@/db/schema";
import { getSession } from "@/server/auth/session";
import { contextoDoPapel } from "@/server/permissoes";
import { FOTO_MAX_BYTES, tipoDeImagem } from "@/lib/comunidade-contato";

type Ctx = RouteContext<"/api/comunidades/[id]/foto">;

/** Foto pública da comunidade (a página pública já é aberta). O `?v=` na URL invalida o cache quando a foto muda. */
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return new Response("Não encontrado", { status: 404 });
  const [f] = await db.select().from(comunidadeFotos).where(eq(comunidadeFotos.comunidadeId, id));
  if (!f) return new Response("Não encontrado", { status: 404 });
  return new Response(new Uint8Array(f.dados), {
    headers: {
      "Content-Type": f.tipo,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

/** Só quem gerencia comunidades, e só da própria paróquia. */
async function autorizar(id: string) {
  const session = await getSession();
  if (!session) return { erro: new Response("Não autenticado", { status: 401 }) };
  if (!z.uuid().safeParse(id).success) return { erro: new Response("Não encontrado", { status: 404 }) };
  const [row] = await db
    .select({ c: comunidades, papel: membrosParoquia.papel })
    .from(comunidades)
    .innerJoin(
      membrosParoquia,
      and(eq(membrosParoquia.paroquiaId, comunidades.paroquiaId), eq(membrosParoquia.usuarioId, session.user.id)),
    )
    .where(eq(comunidades.id, id));
  if (!row || !(await contextoDoPapel(row.c.paroquiaId, row.papel)).permissoes.has("comunidades:gerir")) {
    return { erro: new Response("Não encontrado", { status: 404 }) };
  }
  return { comunidade: row.c };
}

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const a = await autorizar(id);
  if (a.erro) return a.erro;
  const arquivo = (await req.formData().catch(() => null))?.get("foto");
  if (!(arquivo instanceof File) || arquivo.size === 0) return Response.json({ erro: "Escolha uma imagem." }, { status: 400 });
  if (arquivo.size > FOTO_MAX_BYTES) return Response.json({ erro: "A imagem passa de 2 MB." }, { status: 413 });
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const tipo = tipoDeImagem(bytes);
  if (!tipo) return Response.json({ erro: "Use uma imagem JPG, PNG ou WebP." }, { status: 415 });
  const dados = Buffer.from(bytes);
  await db.transaction(async (tx) => {
    await tx
      .insert(comunidadeFotos)
      .values({ comunidadeId: id, tipo, dados })
      .onConflictDoUpdate({ target: comunidadeFotos.comunidadeId, set: { tipo, dados } });
    await tx.update(comunidades).set({ fotoEm: new Date(), updatedAt: new Date() }).where(eq(comunidades.id, id));
  });
  revalidatePath("/painel/comunidades");
  revalidatePath("/[slug]", "layout");
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const a = await autorizar(id);
  if (a.erro) return a.erro;
  await db.transaction(async (tx) => {
    await tx.delete(comunidadeFotos).where(eq(comunidadeFotos.comunidadeId, id));
    await tx.update(comunidades).set({ fotoEm: null, updatedAt: new Date() }).where(eq(comunidades.id, id));
  });
  revalidatePath("/painel/comunidades");
  revalidatePath("/[slug]", "layout");
  return Response.json({ ok: true });
}
