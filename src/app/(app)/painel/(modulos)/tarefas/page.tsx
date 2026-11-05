import { Suspense } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pessoas, tarefas } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { alternarConclusao, alternarItemTarefa, criarTarefa, excluirTarefa } from "@/server/modules/tarefas/actions";
import { hojeNoFuso, tarefaAtrasada } from "@/lib/secretaria";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

async function Conteudo() {
  const { paroquia } = await requireParoquia(["admin", "paroco", "secretaria"]);
  const [lista, gente] = await Promise.all([
    db.select().from(tarefas).where(eq(tarefas.paroquiaId, paroquia.id)).orderBy(asc(tarefas.prazo)),
    db.select({ id: pessoas.id, nome: pessoas.nome }).from(pessoas).where(eq(pessoas.paroquiaId, paroquia.id)).orderBy(asc(pessoas.nome)),
  ]);
  const nome = new Map(gente.map((p) => [p.id, p.nome]));
  const hoje = hojeNoFuso(paroquia.fuso);

  return (
    <>
      <form action={criarTarefa} className="my-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Label className="col-span-2 flex-col items-stretch">
          Tarefa
          <Input name="titulo" required />
        </Label>
        <Label className="flex-col items-stretch">
          Responsável
          <NativeSelect name="responsavelPessoaId" className="w-full">
            <NativeSelectOption value="">Sem responsável</NativeSelectOption>
            {gente.map((p) => <NativeSelectOption key={p.id} value={p.id}>{p.nome}</NativeSelectOption>)}
          </NativeSelect>
        </Label>
        <Label className="flex-col items-stretch">
          Prazo
          <Input name="prazo" type="date" />
        </Label>
        <Label className="col-span-2 flex-col items-stretch">
          Checklist (um item por linha)
          <textarea name="checklist" rows={3} className="rounded-lg border border-input bg-transparent p-2 text-sm" />
        </Label>
        <Button type="submit" className="col-span-2 sm:col-span-1">Adicionar tarefa</Button>
      </form>
      <div className="flex flex-col gap-3">
        {lista.map((t) => {
          const atrasada = tarefaAtrasada(t.prazo, !!t.concluidaEm, hoje);
          return (
            <Card key={t.id}>
              <CardContent className="flex flex-col gap-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <strong className={t.concluidaEm ? "line-through" : ""}>{t.titulo}</strong>
                    <p className="text-sm text-muted-foreground">
                      {t.responsavelPessoaId ? nome.get(t.responsavelPessoaId) : "Sem responsável"}
                      {t.prazo && ` · prazo ${t.prazo.split("-").reverse().join("/")}`}
                    </p>
                  </div>
                  {atrasada && <Badge variant="destructive">Atrasada</Badge>}
                  {t.concluidaEm && <Badge variant="secondary">Concluída</Badge>}
                </div>
                {t.checklist.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {t.checklist.map((item, i) => (
                      <li key={i}>
                        <form action={alternarItemTarefa}>
                          <input type="hidden" name="id" value={t.id} />
                          <input type="hidden" name="indice" value={i} />
                          <button type="submit" className="text-left text-sm">
                            {item.feito ? "☑" : "☐"} <span className={item.feito ? "line-through" : ""}>{item.texto}</span>
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-2">
                  <form action={alternarConclusao}>
                    <input type="hidden" name="id" value={t.id} />
                    <Button type="submit" variant="outline" size="sm">{t.concluidaEm ? "Reabrir" : "Concluir"}</Button>
                  </form>
                  <form action={excluirTarefa}>
                    <input type="hidden" name="id" value={t.id} />
                    <Button type="submit" variant="destructive" size="sm">Excluir</Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!lista.length && <p>Nenhuma tarefa.</p>}
      </div>
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Tarefas da equipe</h1>
      <p className="text-sm text-muted-foreground">As tarefas atrasadas aparecem também no Início.</p>
      <Suspense fallback={<p>Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </main>
  );
}
