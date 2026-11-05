import { Suspense } from "react";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { celebracoes, comunidades, escalaItens, escalas, funcoesEscala, pessoas } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { atribuirItem, gerarEscalaMes, publicarEscala } from "@/server/modules/escalas/actions";
import { formatarDataHora } from "@/lib/datas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

const mesAtual = () => new Date().toISOString().slice(0, 7);

async function Conteudo({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { paroquia } = await requireParoquia("escalas:gerir");
  const { mes: mesParam } = await searchParams;
  const mes = /^\d{4}-\d{2}$/.test(mesParam ?? "") ? mesParam! : mesAtual();

  const [pessoasLista, funcoes, [escala]] = await Promise.all([
    db.select().from(pessoas).where(eq(pessoas.paroquiaId, paroquia.id)).orderBy(asc(pessoas.nome)),
    db.select().from(funcoesEscala).where(eq(funcoesEscala.paroquiaId, paroquia.id)).orderBy(asc(funcoesEscala.nome)),
    db.select().from(escalas).where(and(eq(escalas.paroquiaId, paroquia.id), eq(escalas.mes, mes))),
  ]);
  const nomePessoa = new Map(pessoasLista.map((p) => [p.id, p.nome]));
  const nomeFuncao = new Map(funcoes.map((f) => [f.id, f.nome]));

  const itens = escala
    ? await db
        .select({
          id: escalaItens.id,
          funcaoId: escalaItens.funcaoId,
          pessoaId: escalaItens.pessoaId,
          celebracaoId: escalaItens.celebracaoId,
          inicio: celebracoes.inicio,
          comunidade: comunidades.nome,
        })
        .from(escalaItens)
        .innerJoin(celebracoes, eq(celebracoes.id, escalaItens.celebracaoId))
        .innerJoin(comunidades, eq(comunidades.id, celebracoes.comunidadeId))
        .where(and(eq(escalaItens.escalaId, escala.id), eq(escalaItens.paroquiaId, paroquia.id)))
        .orderBy(asc(celebracoes.inicio))
    : [];
  const porCelebracao = Map.groupBy(itens, (i) => i.celebracaoId);
  const vazias = itens.filter((i) => !i.pessoaId).length;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Escala do mês</CardTitle>
          {escala && (
            <CardDescription className="flex items-center gap-2">
              <Badge variant={escala.status === "publicada" ? "default" : "secondary"}>{escala.status}</Badge>
              {vazias > 0 && `${vazias} vaga(s) sem ninguém`}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <form method="get" className="flex flex-wrap items-end gap-2">
              <Input name="mes" type="month" defaultValue={mes} aria-label="Mês" />
              <Button type="submit" variant="outline">Ver</Button>
            </form>
            {escala?.status !== "publicada" && (
              <form action={gerarEscalaMes}>
                <input type="hidden" name="mes" value={mes} />
                <Button type="submit">{escala ? "Gerar novamente" : "Gerar rascunho"}</Button>
              </form>
            )}
            {escala?.status === "rascunho" && (
              <form action={publicarEscala}>
                <input type="hidden" name="id" value={escala.id} />
                <Button type="submit" variant="secondary">Publicar</Button>
              </form>
            )}
          </div>
          {[...porCelebracao.values()].map((lista) => (
            <div key={lista[0].celebracaoId} className="rounded-lg border p-3">
              <strong>{formatarDataHora(lista[0].inicio, paroquia.fuso)} — {lista[0].comunidade}</strong>
              <ul className="mt-2 flex flex-col gap-2">
                {lista.map((i) => (
                  <li key={i.id} className="flex items-center gap-2">
                    <span className="w-32 text-sm">{nomeFuncao.get(i.funcaoId)}</span>
                    {escala?.status === "rascunho" ? (
                      <form action={atribuirItem} className="flex gap-2">
                        <input type="hidden" name="itemId" value={i.id} />
                        <NativeSelect name="pessoaId" defaultValue={i.pessoaId ?? ""} size="sm" aria-label={nomeFuncao.get(i.funcaoId)}>
                          <NativeSelectOption value="">— vaga aberta —</NativeSelectOption>
                          {pessoasLista.map((p) => <NativeSelectOption key={p.id} value={p.id}>{p.nome}</NativeSelectOption>)}
                        </NativeSelect>
                        <Button type="submit" variant="outline" size="sm">Salvar</Button>
                      </form>
                    ) : (
                      <span>{i.pessoaId ? nomePessoa.get(i.pessoaId) : "—"}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {!escala && <p>Nenhuma escala neste mês.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page({ searchParams }: PageProps<"/painel/escalas">) {
  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <h1 className="mb-4 text-2xl font-semibold">Escala do mês</h1>
      <Suspense fallback={<p>Carregando…</p>}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
