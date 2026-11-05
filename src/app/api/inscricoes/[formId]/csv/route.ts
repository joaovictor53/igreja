import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { formularios, membrosParoquia, respostas } from "@/db/schema";
import { auditar } from "@/server/audit";
import { getSession } from "@/server/auth/session";
import { celulaCsv } from "@/lib/formularios";
import { contextoDoPapel } from "@/server/permissoes";


export async function GET(_req: Request, ctx: RouteContext<"/api/inscricoes/[formId]/csv">) {
  const { formId } = await ctx.params;
  const session = await getSession();
  if (!session) return new Response("Não autenticado", { status: 401 });
  if (!z.uuid().safeParse(formId).success) return new Response("Não encontrado", { status: 404 });

  // só exporta quem tem papel de secretaria na paróquia dona do formulário
  const [row] = await db
    .select({ f: formularios, papel: membrosParoquia.papel })
    .from(formularios)
    .innerJoin(
      membrosParoquia,
      and(eq(membrosParoquia.paroquiaId, formularios.paroquiaId), eq(membrosParoquia.usuarioId, session.user.id)),
    )
    .where(eq(formularios.id, formId));
  if (!row || !(await contextoDoPapel(row.f.paroquiaId, row.papel)).permissoes.has("inscricoes:gerir")) return new Response("Não encontrado", { status: 404 });

  const lista = await db.select().from(respostas).where(eq(respostas.formularioId, row.f.id)).orderBy(asc(respostas.createdAt));
  const cab = ["recebida_em", "status", ...row.f.campos.map((c) => c.rotulo)];
  const linhas = lista.map((r) => [r.createdAt.toISOString(), r.status, ...row.f.campos.map((c) => r.dados[c.id] ?? "")]);
  await auditar(db, {
    paroquiaId: row.f.paroquiaId,
    usuarioId: session.user.id,
    tabela: "respostas",
    registroId: row.f.id,
    acao: "exportar",
    depois: { formulario: row.f.titulo, linhas: lista.length },
  });
  const csv = [cab, ...linhas].map((l) => l.map(celulaCsv).join(",")).join("\r\n");

  return new Response("﻿" + csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="inscricoes-${row.f.id}.csv"`,
      "cache-control": "no-store",
    },
  });
}
