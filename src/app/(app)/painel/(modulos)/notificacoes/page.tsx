import { Suspense } from "react";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notificacoes } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { marcarTodasLidas } from "@/server/modules/notificacoes/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

async function Conteudo() {
  const { paroquia, user } = await requireParoquia();
  const lista = await db
    .select()
    .from(notificacoes)
    .where(eq(notificacoes.usuarioId, user.id))
    .orderBy(desc(notificacoes.createdAt))
    .limit(50);
  const naoLidas = lista.filter((n) => !n.lidaEm).length;
  const quando = (d: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: paroquia.fuso, dateStyle: "short", timeStyle: "short" }).format(d);

  return (
    <>
      {naoLidas > 0 && (
        <form action={marcarTodasLidas} className="my-3">
          <Button type="submit" variant="outline" size="sm">Marcar todas como lidas</Button>
        </form>
      )}
      <Card className="mt-3">
        <CardContent className="flex flex-col gap-3">
          {lista.map((n, i) => (
            <div key={n.id} className="flex flex-col gap-1">
              {i > 0 && <Separator className="mb-2" />}
              <div className="flex flex-wrap items-center gap-2">
                <strong>{n.titulo}</strong>
                {!n.lidaEm && <Badge>nova</Badge>}
                <span className="text-sm text-muted-foreground">{quando(n.createdAt)}</span>
              </div>
              <p className="text-sm">{n.corpo}</p>
              {n.url && <Link href={n.url} className="w-fit text-sm underline">Abrir</Link>}
            </div>
          ))}
          {!lista.length && <p>Nenhuma notificação.</p>}
        </CardContent>
      </Card>
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Notificações</h1>
      <p className="text-sm text-muted-foreground">
        Use &ldquo;Ativar avisos neste aparelho&rdquo; no topo para receber também no celular, mesmo com o sistema fechado.
      </p>
      <Suspense fallback={<p>Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </main>
  );
}
