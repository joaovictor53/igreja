import { Suspense } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { comunidades, eventos } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { criarEvento, excluirEvento } from "@/server/modules/agenda/actions";
import { formatarDataHora } from "@/lib/datas";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";

async function Conteudo() {
  const { paroquia } = await requireParoquia("agenda:gerir");
  const [lista, coms] = await Promise.all([
    db
      .select({ id: eventos.id, titulo: eventos.titulo, local: eventos.local, inicio: eventos.inicio, comunidade: comunidades.nome })
      .from(eventos)
      .leftJoin(comunidades, eq(comunidades.id, eventos.comunidadeId))
      .where(eq(eventos.paroquiaId, paroquia.id))
      .orderBy(asc(eventos.inicio))
      .limit(100),
    db.select({ id: comunidades.id, nome: comunidades.nome }).from(comunidades).where(eq(comunidades.paroquiaId, paroquia.id)).orderBy(asc(comunidades.nome)),
  ]);

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Página pública: <a className="underline" href={`/${paroquia.slug}`}>/{paroquia.slug}</a> · Feed:{" "}
        <a className="underline" href={`/api/ics/${paroquia.slug}`}>/api/ics/{paroquia.slug}</a>
      </p>
      <form action={criarEvento} className="my-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:grid-cols-5">
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
        <Label className="col-span-2 flex-col items-stretch">
          Local
          <Input name="local" />
        </Label>
        <Label className="col-span-2 flex-col items-stretch">
          Comunidade
          <NativeSelect name="comunidadeId" defaultValue="" className="w-full">
            <NativeSelectOption value="">Paróquia toda</NativeSelectOption>
            {coms.map((c) => <NativeSelectOption key={c.id} value={c.id}>{c.nome}</NativeSelectOption>)}
          </NativeSelect>
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
                  {e.comunidade && <span className="text-muted-foreground"> · {e.comunidade}</span>}
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
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Agenda pública</h1>
      <Suspense fallback={<p>Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </main>
  );
}
