import { Suspense } from "react";
import Link from "next/link";
import { and, asc, count, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { celebracoes, comunidades, intencoes } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { cancelarCelebracao, gerarCelebracoes } from "@/server/modules/celebracoes/actions";
import { formatarDataHora } from "@/lib/datas";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

async function Conteudo() {
  const { paroquia } = await requireParoquia(["admin", "paroco", "secretaria"]);
  const lista = await db
    .select({
      id: celebracoes.id,
      inicio: celebracoes.inicio,
      tipo: celebracoes.tipo,
      status: celebracoes.status,
      comunidade: comunidades.nome,
      intencoes: count(intencoes.id),
    })
    .from(celebracoes)
    .innerJoin(comunidades, eq(comunidades.id, celebracoes.comunidadeId))
    .leftJoin(intencoes, eq(intencoes.celebracaoId, celebracoes.id))
    .where(and(eq(celebracoes.paroquiaId, paroquia.id), gte(celebracoes.inicio, new Date())))
    .groupBy(celebracoes.id, comunidades.nome)
    .orderBy(asc(celebracoes.inicio))
    .limit(60);

  return (
    <>
      <form action={gerarCelebracoes} className="my-3">
        <Button type="submit" variant="outline">Gerar celebrações dos próximos 3 meses</Button>
      </form>
      <Card>
        <CardContent className="flex flex-col gap-3">
          {lista.map((c, i) => (
            <div key={c.id} className="flex flex-col gap-3">
              {i > 0 && <Separator />}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <span className={c.status === "cancelada" ? "line-through opacity-60" : ""}>
                    {formatarDataHora(c.inicio, paroquia.fuso)} — {c.comunidade}
                  </span>
                  <Badge variant="secondary">{c.tipo}</Badge>
                  {c.status === "cancelada" && <Badge variant="destructive">cancelada</Badge>}
                </span>
                <span className="flex items-center gap-2">
                  <Link href={`/painel/liturgia/intencoes/${c.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    Intenções ({c.intencoes})
                  </Link>
                  {c.status !== "cancelada" && (
                    <form action={cancelarCelebracao}>
                      <input type="hidden" name="id" value={c.id} />
                      <Button type="submit" variant="destructive" size="sm">Cancelar</Button>
                    </form>
                  )}
                </span>
              </div>
            </div>
          ))}
          {!lista.length && <p>Nenhuma celebração futura. Cadastre horários primeiro.</p>}
        </CardContent>
      </Card>
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Celebrações</h1>
      <Suspense fallback={<p>Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </main>
  );
}
