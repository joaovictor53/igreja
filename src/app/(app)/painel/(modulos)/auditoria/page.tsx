import { Suspense } from "react";
import Link from "next/link";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditoria, user as usuarios } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { ACOES_AUDITADAS, TABELAS_AUDITADAS, type TabelaAuditada } from "@/lib/auditoria-constantes";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";

const POR_PAGINA = 30;

const hora = (d: Date, tz: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: tz, dateStyle: "short", timeStyle: "medium" }).format(d);

async function Conteudo({ searchParams }: { searchParams: Promise<{ t?: string; p?: string }> }) {
  // somente admin e pároco veem a trilha (ela contém dados pessoais)
  const { paroquia } = await requireParoquia("auditoria:ver");
  const { t, p } = await searchParams;
  const tabela = t && t in TABELAS_AUDITADAS ? (t as TabelaAuditada) : undefined;
  const pagina = Math.max(1, Number.parseInt(p ?? "1", 10) || 1);
  const filtro = and(eq(auditoria.paroquiaId, paroquia.id), tabela ? eq(auditoria.tabela, tabela) : undefined);

  const [linhas, [{ total }]] = await Promise.all([
    db
      .select({ a: auditoria, quem: usuarios.name })
      .from(auditoria)
      .leftJoin(usuarios, eq(usuarios.id, auditoria.usuarioId))
      .where(filtro)
      .orderBy(desc(auditoria.em))
      .limit(POR_PAGINA)
      .offset((pagina - 1) * POR_PAGINA),
    db.select({ total: count() }).from(auditoria).where(filtro),
  ]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const link = (n: number) => `/painel/auditoria?${new URLSearchParams({ ...(tabela ? { t: tabela } : {}), p: String(n) })}`;

  return (
    <>
      <form method="get" className="my-4 flex flex-wrap items-end gap-2">
        <Label className="flex-col items-stretch">
          Registro
          <NativeSelect name="t" defaultValue={tabela ?? ""}>
            <NativeSelectOption value="">Todos</NativeSelectOption>
            {Object.entries(TABELAS_AUDITADAS).map(([k, n]) => <NativeSelectOption key={k} value={k}>{n}</NativeSelectOption>)}
          </NativeSelect>
        </Label>
        <Button type="submit" variant="outline">Filtrar</Button>
      </form>
      <Card>
        <CardContent className="flex flex-col gap-3">
          {linhas.map(({ a, quem }, i) => (
            <div key={a.id} className="flex flex-col gap-2">
              {i > 0 && <Separator />}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">{hora(a.em, paroquia.fuso)}</span>
                <strong>{quem ?? "usuário removido"}</strong>
                <Badge variant={a.acao === "revogar" || a.acao === "excluir" ? "destructive" : "secondary"}>{ACOES_AUDITADAS[a.acao]}</Badge>
                <span>{TABELAS_AUDITADAS[a.tabela]}</span>
                <code className="text-xs text-muted-foreground">{a.registroId.slice(0, 8)}</code>
              </div>
              {(a.antes != null || a.depois != null) && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground">Detalhes</summary>
                  <div className="mt-1 grid gap-2 sm:grid-cols-1 sm:grid-cols-2">
                    {a.antes != null && (
                      <pre className="overflow-x-auto rounded-md bg-muted p-2 text-xs">Antes: {JSON.stringify(a.antes, null, 2)}</pre>
                    )}
                    {a.depois != null && (
                      <pre className="overflow-x-auto rounded-md bg-muted p-2 text-xs">Depois: {JSON.stringify(a.depois, null, 2)}</pre>
                    )}
                  </div>
                </details>
              )}
            </div>
          ))}
          {!linhas.length && <p>Nenhum registro de auditoria.</p>}
        </CardContent>
      </Card>
      <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Paginação">
        {pagina > 1 ? (
          <Link href={link(pagina - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>← Anterior</Link>
        ) : <span />}
        <span className="text-muted-foreground">Página {pagina} de {paginas} — {total} registro(s)</span>
        {pagina < paginas ? (
          <Link href={link(pagina + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>Próxima →</Link>
        ) : <span />}
      </nav>
    </>
  );
}

export default function Page({ searchParams }: PageProps<"/painel/auditoria">) {
  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Auditoria</h1>
      <p className="text-sm text-muted-foreground">
        Quem criou, emitiu, revogou, baixou ou exportou dados sensíveis. O histórico não pode ser alterado nem apagado.
      </p>
      <Suspense fallback={<p>Carregando…</p>}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
