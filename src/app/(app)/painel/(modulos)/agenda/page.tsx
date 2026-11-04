import { Suspense } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { eventos } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { criarEvento, excluirEvento } from "@/server/modules/agenda/actions";
import { formatarDataHora } from "@/lib/datas";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

async function Conteudo() {
  const { paroquia } = await requireParoquia(["admin", "paroco", "secretaria"]);
  const lista = await db
    .select()
    .from(eventos)
    .where(eq(eventos.paroquiaId, paroquia.id))
    .orderBy(asc(eventos.inicio))
    .limit(100);

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Página pública: <a className="underline" href={`/${paroquia.slug}`}>/{paroquia.slug}</a> · Feed:{" "}
        <a className="underline" href={`/api/ics/${paroquia.slug}`}>/api/ics/{paroquia.slug}</a>
      </p>
      <form action={criarEvento} className="my-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Label className="col-span-2 flex-col items-stretch">
          Título
          <Input name="titulo" required />
        </Label>
        <Label className="flex-col items-stretch">
          Data
          <Input name="data" type="date" required />
        </Label>
        <Label className="flex-col items-stretch">
          Hora
          <Input name="hora" type="time" required />
        </Label>
        <Label className="col-span-2 flex-col items-stretch sm:col-span-4">
          Local
          <Input name="local" />
        </Label>
        <Button type="submit" className="self-end">Adicionar</Button>
      </form>
      <Card>
        <CardContent className="flex flex-col gap-3">
          {lista.map((e, i) => (
            <div key={e.id} className="flex flex-col gap-3">
              {i > 0 && <Separator />}
              <div className="flex items-center justify-between">
                <span>
                  {formatarDataHora(e.inicio, paroquia.fuso)} — {e.titulo}
                  {e.local && ` (${e.local})`}
                </span>
                <form action={excluirEvento}>
                  <input type="hidden" name="id" value={e.id} />
                  <Button type="submit" variant="destructive" size="sm">Excluir</Button>
                </form>
              </div>
            </div>
          ))}
          {!lista.length && <p>Nenhum evento.</p>}
        </CardContent>
      </Card>
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Agenda pública</h1>
      <Suspense fallback={<p>Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </main>
  );
}
