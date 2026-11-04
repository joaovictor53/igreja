import { Suspense } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { comunidades, horariosRecorrentes } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { criarHorario } from "@/server/modules/celebracoes/actions";
import { NOMES_DIAS, lerRrule } from "@/lib/datas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";

async function Conteudo() {
  const { paroquia } = await requireParoquia(["admin", "paroco", "secretaria"]);
  const [coms, horarios] = await Promise.all([
    db.select().from(comunidades).where(eq(comunidades.paroquiaId, paroquia.id)).orderBy(asc(comunidades.nome)),
    db.select().from(horariosRecorrentes).where(eq(horariosRecorrentes.paroquiaId, paroquia.id)),
  ]);
  const nomeCom = new Map(coms.map((c) => [c.id, c.nome]));
  const ordenados = horarios
    .map((h) => ({ ...h, ...lerRrule(h.rrule) }))
    .sort((a, b) => a.diaSemana - b.diaSemana || a.hora - b.hora || a.minuto - b.minuto);

  return (
    <>
      <form action={criarHorario} className="my-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Label className="flex-col items-stretch">
          Comunidade
          <NativeSelect name="comunidadeId" required className="w-full">
            {coms.map((c) => <NativeSelectOption key={c.id} value={c.id}>{c.nome}</NativeSelectOption>)}
          </NativeSelect>
        </Label>
        <Label className="flex-col items-stretch">
          Dia
          <NativeSelect name="diaSemana" className="w-full">
            {NOMES_DIAS.map((n, i) => <NativeSelectOption key={n} value={i}>{n}</NativeSelectOption>)}
          </NativeSelect>
        </Label>
        <Label className="flex-col items-stretch">
          Hora
          <Input name="hora" type="time" required defaultValue="19:00" />
        </Label>
        <Label className="flex-col items-stretch">
          Tipo
          <NativeSelect name="tipo" className="w-full">
            <NativeSelectOption value="missa">Missa</NativeSelectOption>
            <NativeSelectOption value="confissao">Confissão</NativeSelectOption>
          </NativeSelect>
        </Label>
        <Button type="submit" className="self-end">Adicionar</Button>
      </form>
      <Card>
        <CardContent className="flex flex-col gap-3">
          {ordenados.map((h, i) => (
            <div key={h.id} className="flex flex-col gap-3">
              {i > 0 && <Separator />}
              <div className="flex items-center gap-2">
                <span>
                  {NOMES_DIAS[h.diaSemana]} {String(h.hora).padStart(2, "0")}:{String(h.minuto).padStart(2, "0")} —{" "}
                  {nomeCom.get(h.comunidadeId)}
                </span>
                <Badge variant="secondary">{h.tipo}</Badge>
              </div>
            </div>
          ))}
          {!ordenados.length && <p>Nenhum horário cadastrado.</p>}
        </CardContent>
      </Card>
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Horários semanais</h1>
      <p className="text-sm text-muted-foreground">Ao adicionar, as celebrações dos próximos 3 meses são geradas.</p>
      <Suspense fallback={<p>Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </main>
  );
}
