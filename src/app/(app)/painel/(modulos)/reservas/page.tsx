import { Suspense } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { espacos, reservas } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { criarEspaco, criarReserva, decidirReserva, excluirReserva } from "@/server/modules/reservas/actions";
import { formatarDataHora } from "@/lib/datas";
import { haConflito } from "@/lib/secretaria";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

async function Conteudo() {
  const { paroquia } = await requireParoquia(["admin", "paroco", "secretaria"]);
  const [salas, lista] = await Promise.all([
    db.select().from(espacos).where(eq(espacos.paroquiaId, paroquia.id)).orderBy(asc(espacos.nome)),
    db.select().from(reservas).where(eq(reservas.paroquiaId, paroquia.id)).orderBy(asc(reservas.inicio)),
  ]);
  const nomeEspaco = new Map(salas.map((s) => [s.id, s.nome]));
  const aprovadas = lista.filter((r) => r.status === "aprovada");
  const emConflito = (r: (typeof lista)[number]) =>
    r.status !== "recusada" && aprovadas.some((a) => a.id !== r.id && a.espacoId === r.espacoId && haConflito(a, r));
  const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: paroquia.fuso, hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <form action={criarEspaco} className="my-4 flex gap-2">
        <Input name="nome" required placeholder="Ex.: Salão paroquial" aria-label="Nome do espaço" />
        <Button type="submit" variant="outline">Adicionar espaço</Button>
      </form>
      {salas.length > 0 && (
        <form action={criarReserva} className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Label className="flex-col items-stretch">
            Espaço
            <NativeSelect name="espacoId" required className="w-full">
              {salas.map((s) => <NativeSelectOption key={s.id} value={s.id}>{s.nome}</NativeSelectOption>)}
            </NativeSelect>
          </Label>
          <Label className="flex-col items-stretch sm:col-span-3">
            Evento
            <Input name="titulo" required />
          </Label>
          <Label className="flex-col items-stretch">
            Solicitante
            <Input name="solicitante" required />
          </Label>
          <Label className="flex-col items-stretch">
            Data
            <Input name="data" type="date" required />
          </Label>
          <Label className="flex-col items-stretch">
            Início
            <Input name="inicio" type="time" required />
          </Label>
          <Label className="flex-col items-stretch">
            Fim
            <Input name="fim" type="time" required />
          </Label>
          <Button type="submit" className="col-span-2 sm:col-span-4">Pedir reserva</Button>
        </form>
      )}
      <div className="flex flex-col gap-3">
        {lista.map((r) => (
          <Card key={r.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <strong>{r.titulo}</strong> — {nomeEspaco.get(r.espacoId)}
                <p className="text-sm text-muted-foreground">
                  {formatarDataHora(r.inicio, paroquia.fuso)} às {hora.format(r.fim)} · {r.solicitante}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {emConflito(r) && <Badge variant="destructive">Conflito de horário</Badge>}
                <Badge variant="secondary">{r.status}</Badge>
                {r.status === "pendente" && (
                  <>
                    <form action={decidirReserva}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value="aprovada" />
                      <Button type="submit" size="sm">Aprovar</Button>
                    </form>
                    <form action={decidirReserva}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value="recusada" />
                      <Button type="submit" variant="outline" size="sm">Recusar</Button>
                    </form>
                  </>
                )}
                <form action={excluirReserva}>
                  <input type="hidden" name="id" value={r.id} />
                  <Button type="submit" variant="destructive" size="sm">Excluir</Button>
                </form>
              </div>
            </CardContent>
          </Card>
        ))}
        {!lista.length && <p>Nenhuma reserva.</p>}
      </div>
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Reserva de espaços</h1>
      <p className="text-sm text-muted-foreground">Uma reserva só pode ser aprovada se o espaço estiver livre no horário.</p>
      <Suspense fallback={<p>Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </main>
  );
}
