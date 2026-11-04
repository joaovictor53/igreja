import { Suspense } from "react";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { comunidades, etapasCatequese, matriculasCatequese, turmaCatequistas, turmasCatequese } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { criarEtapa, criarTurma } from "@/server/modules/catequese/actions";
import { NOMES_DIAS } from "@/lib/datas";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

const PAPEIS = ["admin", "paroco", "secretaria", "catequista"] as const;

async function Conteudo() {
  const { paroquia, papel } = await requireParoquia([...PAPEIS]);
  const pode = papel !== "catequista";
  const [etapas, turmas, matriculas, catequistas, comunidadesLista] = await Promise.all([
    db.select().from(etapasCatequese).where(eq(etapasCatequese.paroquiaId, paroquia.id)).orderBy(asc(etapasCatequese.ordem)),
    db.select().from(turmasCatequese).where(eq(turmasCatequese.paroquiaId, paroquia.id)).orderBy(asc(turmasCatequese.nome)),
    db.select().from(matriculasCatequese).where(eq(matriculasCatequese.paroquiaId, paroquia.id)),
    db.select().from(turmaCatequistas).where(eq(turmaCatequistas.paroquiaId, paroquia.id)),
    db.select().from(comunidades).where(eq(comunidades.paroquiaId, paroquia.id)).orderBy(asc(comunidades.nome)),
  ]);
  const nomeEtapa = new Map(etapas.map((e) => [e.id, e.nome]));
  const nomeComunidade = new Map(comunidadesLista.map((c) => [c.id, c.nome]));
  const ativas = matriculas.filter((m) => m.status === "ativa");
  const indicadores = [
    ["Turmas", turmas.length],
    ["Catequizandos", ativas.length],
    ["Documento pendente", ativas.filter((m) => m.documentoPendente).length],
    ["Catequistas", new Set(catequistas.map((c) => c.pessoaId)).size],
  ] as const;
  const anoAtual = new Date().getFullYear();

  return (
    <>
      <div className="my-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {indicadores.map(([rotulo, valor]) => (
          <Card key={rotulo}>
            <CardContent>
              <p className="text-2xl font-semibold">{valor}</p>
              <p className="text-sm text-muted-foreground">{rotulo}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {pode && (
        <>
          <form action={criarEtapa} className="mb-4 flex gap-2">
            <Input name="nome" required placeholder="Nova etapa. Ex.: Eucaristia 1" aria-label="Nome da etapa" />
            <Button type="submit" variant="outline">Adicionar etapa</Button>
          </form>
          {etapas.length > 0 && (
            <form action={criarTurma} className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Label className="flex-col items-stretch">
                Etapa
                <NativeSelect name="etapaId" required className="w-full">
                  {etapas.map((e) => <NativeSelectOption key={e.id} value={e.id}>{e.nome}</NativeSelectOption>)}
                </NativeSelect>
              </Label>
              <Label className="flex-col items-stretch">
                Nome da turma
                <Input name="nome" required />
              </Label>
              <Label className="flex-col items-stretch">
                Ano
                <Input name="ano" type="number" defaultValue={anoAtual} required />
              </Label>
              <Label className="flex-col items-stretch">
                Comunidade
                <NativeSelect name="comunidadeId" className="w-full">
                  <NativeSelectOption value="">Qualquer</NativeSelectOption>
                  {comunidadesLista.map((c) => <NativeSelectOption key={c.id} value={c.id}>{c.nome}</NativeSelectOption>)}
                </NativeSelect>
              </Label>
              <Label className="flex-col items-stretch">
                Dia do encontro
                <NativeSelect name="diaSemana" className="w-full" defaultValue="6">
                  {NOMES_DIAS.map((d, i) => <NativeSelectOption key={d} value={i}>{d}</NativeSelectOption>)}
                </NativeSelect>
              </Label>
              <Label className="flex-col items-stretch">
                Hora
                <Input name="hora" type="time" defaultValue="15:00" required />
              </Label>
              <Label className="flex-col items-stretch">
                Vagas
                <Input name="vagas" type="number" min={1} defaultValue={25} required />
              </Label>
              <Button type="submit" className="self-end">Criar turma</Button>
            </form>
          )}
        </>
      )}

      <div className="flex flex-col gap-3">
        {turmas.map((t) => {
          const ocupadas = ativas.filter((m) => m.turmaId === t.id).length;
          return (
            <Card key={t.id}>
              <CardContent className="flex items-center justify-between gap-3">
                <div>
                  <Link href={`/painel/catequese/${t.id}`} className="font-semibold underline">
                    {t.nome}
                  </Link>{" "}
                  <span className="text-sm text-muted-foreground">
                    — {nomeEtapa.get(t.etapaId)} · {t.ano}
                  </span>
                  <p className="text-sm text-muted-foreground">
                    {NOMES_DIAS[t.diaSemana]} às {t.hora}
                    {t.comunidadeId && ` · ${nomeComunidade.get(t.comunidadeId)}`}
                  </p>
                </div>
                <span className="text-sm">{ocupadas}/{t.vagas} vagas</span>
              </CardContent>
            </Card>
          );
        })}
        {!turmas.length && <p>Nenhuma turma cadastrada.</p>}
      </div>
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Catequese</h1>
      <Suspense fallback={<p>Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </main>
  );
}
