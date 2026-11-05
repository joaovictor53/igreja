import { Suspense } from "react";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { matriculasCatequese, pessoas, turmaCatequistas, turmasCatequese } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import {
  adicionarCatequista,
  alternarDocumentoMatricula,
  matricular,
  mudarStatusMatricula,
  rematricular,
  removerCatequista,
} from "@/server/modules/catequese/actions";
import { NOMES_DIAS } from "@/lib/datas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

const STATUS = ["ativa", "concluida", "desistente"] as const;

async function Conteudo({ params }: { params: Promise<{ turmaId: string }> }) {
  const { turmaId } = await params;
  if (!z.uuid().safeParse(turmaId).success) notFound();
  const { paroquia, pode: podeFazer } = await requireParoquia("catequese:ver");
  const pode = podeFazer("catequese:gerir");
  const [turma] = await db
    .select()
    .from(turmasCatequese)
    .where(and(eq(turmasCatequese.id, turmaId), eq(turmasCatequese.paroquiaId, paroquia.id)));
  if (!turma) notFound();

  const [gente, matriculas, equipe, outras] = await Promise.all([
    db.select({ id: pessoas.id, nome: pessoas.nome }).from(pessoas).where(eq(pessoas.paroquiaId, paroquia.id)).orderBy(asc(pessoas.nome)),
    db.select().from(matriculasCatequese).where(eq(matriculasCatequese.turmaId, turma.id)),
    db.select().from(turmaCatequistas).where(eq(turmaCatequistas.turmaId, turma.id)),
    db.select().from(turmasCatequese).where(eq(turmasCatequese.paroquiaId, paroquia.id)).orderBy(asc(turmasCatequese.ano), asc(turmasCatequese.nome)),
  ]);
  const nome = new Map(gente.map((p) => [p.id, p.nome]));
  const ativas = matriculas.filter((m) => m.status === "ativa").length;

  return (
    <>
      <h1 className="text-2xl font-semibold">{turma.nome}</h1>
      <p className="text-sm text-muted-foreground">
        {turma.ano} · {NOMES_DIAS[turma.diaSemana]} às {turma.hora} · {ativas}/{turma.vagas} vagas
      </p>

      <h2 className="mt-6 mb-2 font-semibold">Catequistas</h2>
      <ul className="mb-2 flex flex-wrap gap-2">
        {equipe.map((c) => (
          <li key={c.id}>
            <Badge variant="secondary" className="gap-1">
              {nome.get(c.pessoaId)}
              {pode && (
                <form action={removerCatequista} className="inline">
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" aria-label={`Remover ${nome.get(c.pessoaId)}`} className="text-destructive">×</button>
                </form>
              )}
            </Badge>
          </li>
        ))}
        {!equipe.length && <li className="text-sm text-muted-foreground">Sem catequistas.</li>}
      </ul>
      {pode && (
        <form action={adicionarCatequista} className="flex gap-2">
          <input type="hidden" name="turmaId" value={turma.id} />
          <NativeSelect name="pessoaId" required aria-label="Catequista" className="flex-1">
            {gente.map((p) => <NativeSelectOption key={p.id} value={p.id}>{p.nome}</NativeSelectOption>)}
          </NativeSelect>
          <Button type="submit" variant="outline" size="sm" className="self-center">Incluir</Button>
        </form>
      )}

      <h2 className="mt-6 mb-2 font-semibold">Catequizandos</h2>
      {pode && (
        <form action={matricular} className="mb-3 flex gap-2">
          <input type="hidden" name="turmaId" value={turma.id} />
          <NativeSelect name="pessoaId" required aria-label="Pessoa a matricular" className="flex-1">
            {gente.map((p) => <NativeSelectOption key={p.id} value={p.id}>{p.nome}</NativeSelectOption>)}
          </NativeSelect>
          <Button type="submit" size="sm" className="self-center">Matricular</Button>
        </form>
      )}
      <Card>
        <CardContent className="flex flex-col gap-3">
          {matriculas.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>{nome.get(m.pessoaId)}</span>
              <div className="flex flex-wrap items-center gap-2">
                {m.documentoPendente && <Badge variant="destructive">Documento pendente</Badge>}
                {pode && (
                  <>
                    <form action={alternarDocumentoMatricula}>
                      <input type="hidden" name="id" value={m.id} />
                      <Button type="submit" variant="outline" size="sm">
                        {m.documentoPendente ? "Documento entregue" : "Marcar pendente"}
                      </Button>
                    </form>
                    <form action={mudarStatusMatricula} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={m.id} />
                      <NativeSelect name="status" defaultValue={m.status} size="sm" aria-label="Situação">
                        {STATUS.map((s) => <NativeSelectOption key={s} value={s}>{s}</NativeSelectOption>)}
                      </NativeSelect>
                      <Button type="submit" variant="outline" size="sm">Salvar</Button>
                    </form>
                  </>
                )}
              </div>
            </div>
          ))}
          {!matriculas.length && <p>Nenhum catequizando.</p>}
        </CardContent>
      </Card>

      {pode && (
        <>
          <h2 className="mt-6 mb-2 font-semibold">Rematrícula</h2>
          <p className="mb-2 text-sm text-muted-foreground">
            Leva os catequizandos ativos desta turma para a turma escolhida e conclui a matrícula atual.
          </p>
          <form action={rematricular} className="flex gap-2">
            <input type="hidden" name="origemId" value={turma.id} />
            <NativeSelect name="destinoId" required aria-label="Turma de destino" className="flex-1">
              {outras.filter((o) => o.id !== turma.id).map((o) => (
                <NativeSelectOption key={o.id} value={o.id}>{o.nome} ({o.ano})</NativeSelectOption>
              ))}
            </NativeSelect>
            <Button type="submit" variant="outline" size="sm" className="self-center">Rematricular</Button>
          </form>
        </>
      )}
    </>
  );
}

export default function Page({ params }: PageProps<"/painel/catequese/[turmaId]">) {
  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <Suspense fallback={<p>Carregando…</p>}>
        <Conteudo params={params} />
      </Suspense>
    </main>
  );
}
