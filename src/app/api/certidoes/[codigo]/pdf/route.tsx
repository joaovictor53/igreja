import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { certidoes, membrosParoquia, paroquias } from "@/db/schema";
import { auditar } from "@/server/audit";
import { getSession } from "@/server/auth/session";
import { CertidaoPdf } from "@/pdf/certidao";
import { codigoValido } from "@/lib/registros";
import { contextoDoPapel } from "@/server/permissoes";


export async function GET(_req: Request, ctx: RouteContext<"/api/certidoes/[codigo]/pdf">) {
  const { codigo } = await ctx.params;
  const session = await getSession();
  if (!session) return new Response("Não autenticado", { status: 401 });
  if (!codigoValido(codigo)) return new Response("Não encontrada", { status: 404 });

  // só quem tem papel de secretaria na paróquia dona da certidão baixa o PDF
  const [row] = await db
    .select({ c: certidoes, paroquia: paroquias.nome, papel: membrosParoquia.papel })
    .from(certidoes)
    .innerJoin(paroquias, eq(paroquias.id, certidoes.paroquiaId))
    .innerJoin(
      membrosParoquia,
      and(eq(membrosParoquia.paroquiaId, certidoes.paroquiaId), eq(membrosParoquia.usuarioId, session.user.id)),
    )
    .where(eq(certidoes.codigo, codigo));
  if (!row || !(await contextoDoPapel(row.c.paroquiaId, row.papel)).permissoes.has("registros:gerir")) return new Response("Não encontrada", { status: 404 });

  await auditar(db, {
    paroquiaId: row.c.paroquiaId,
    usuarioId: session.user.id,
    tabela: "certidoes",
    registroId: row.c.id,
    acao: "baixar",
    depois: { codigo: row.c.codigo },
  });

  const origem = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const urlValidacao = `${origem}/validar/${row.c.codigo}`;
  const qrDataUrl = await QRCode.toDataURL(urlValidacao, { margin: 1, width: 280 });
  const emitidaEm = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Manaus" }).format(row.c.emitidaEm);

  const pdf = await renderToBuffer(
    <CertidaoPdf
      paroquia={row.paroquia}
      tipo={row.c.tipoRegistro}
      paragrafos={row.c.paragrafos}
      codigo={row.c.codigo}
      emitidaEm={emitidaEm}
      urlValidacao={urlValidacao}
      qrDataUrl={qrDataUrl}
      revogada={!!row.c.revogadaEm}
    />,
  );

  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="certidao-${row.c.codigo}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
