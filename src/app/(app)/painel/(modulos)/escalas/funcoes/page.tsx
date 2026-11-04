import { Suspense } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { funcaoMembros, funcoesEscala, pessoas } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { adicionarMembro, criarFuncao, removerMembro } from "@/server/modules/escalas/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

async function Conteudo() {
  const { paroquia } = await requireParoquia(["admin", "paroco", "secretaria"]);
  const [pessoasLista, funcoes, membros] = await Promise.all([
    db.select().from(pessoas).where(eq(pessoas.paroquiaId, paroquia.id)).orderBy(asc(pessoas.nome)),
    db.select().from(funcoesEscala).where(eq(funcoesEscala.paroquiaId, paroquia.id)).orderBy(asc(funcoesEscala.nome)),
    db.select().from(funcaoMembros).where(eq(funcaoMembros.paroquiaId, paroquia.id)),
  ]);
  const nomePessoa = new Map(pessoasLista.map((p) => [p.id, p.nome]));

  return (
    <>
      <form action={criarFuncao} className="my-4 flex gap-2">
        <Input name="nome" required placeholder="Ex.: Leitor" aria-label="Nome da função" />
        <Input name="vagas" type="number" min={1} max={20} defaultValue={1} aria-label="Vagas por celebração" className="w-20" />
        <Button type="submit">Adicionar</Button>
      </form>
      <div className="flex flex-col gap-4">
        {funcoes.map((f) => {
          const meus = membros.filter((m) => m.funcaoId === f.id);
          return (
            <Card key={f.id}>
              <CardContent className="flex flex-col gap-3">
                <div>
                  <strong>{f.nome}</strong>{" "}
                  <span className="text-sm text-muted-foreground">— {f.vagas} vaga(s) por celebração</span>
                </div>
                <ul className="flex flex-wrap gap-2">
                  {meus.map((m) => (
                    <li key={m.id}>
                      <Badge variant="secondary" className="gap-1">
                        {nomePessoa.get(m.pessoaId)}
                        <form action={removerMembro} className="inline">
                          <input type="hidden" name="id" value={m.id} />
                          <button aria-label={`Remover ${nomePessoa.get(m.pessoaId)}`} className="text-destructive">×</button>
                        </form>
                      </Badge>
                    </li>
                  ))}
                  {!meus.length && <li className="text-sm text-muted-foreground">Sem membros.</li>}
                </ul>
                <form action={adicionarMembro} className="flex gap-2">
                  <input type="hidden" name="funcaoId" value={f.id} />
                  <NativeSelect name="pessoaId" required aria-label={`Pessoa para ${f.nome}`} className="flex-1">
                    {pessoasLista.map((p) => <NativeSelectOption key={p.id} value={p.id}>{p.nome}</NativeSelectOption>)}
                  </NativeSelect>
                  <Button type="submit" variant="outline" size="sm" className="self-center">Incluir</Button>
                </form>
              </CardContent>
            </Card>
          );
        })}
        {!funcoes.length && <p>Nenhuma função cadastrada.</p>}
      </div>
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Funções da escala</h1>
      <p className="text-sm text-muted-foreground">
        Pessoas são cadastradas no módulo Pessoas. Aqui você define as funções e quem pode exercê-las.
      </p>
      <Suspense fallback={<p>Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </main>
  );
}
