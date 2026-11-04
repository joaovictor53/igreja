import { Suspense } from "react";
import { and, asc, eq, gte, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { celebracoes, comunidades, escalaItens, escalas, funcaoMembros, funcoesEscala, pessoas, trocas } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { cancelarTroca } from "@/server/modules/trocas/actions";
import { formatarDataHora } from "@/lib/datas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AssumirTrocaBotao, PedirTrocaBotao } from "./troca-botoes";

async function Conteudo() {
  const { paroquia, pessoaId } = await requireParoquia();
  if (!pessoaId) return <p>Sua conta ainda não está vinculada a uma pessoa. Peça um convite à secretaria.</p>;
  const agora = new Date();

  const minhas = await db
    .select({
      id: escalaItens.id,
      funcao: funcoesEscala.nome,
      inicio: celebracoes.inicio,
      comunidade: comunidades.nome,
    })
    .from(escalaItens)
    .innerJoin(escalas, eq(escalas.id, escalaItens.escalaId))
    .innerJoin(celebracoes, eq(celebracoes.id, escalaItens.celebracaoId))
    .innerJoin(comunidades, eq(comunidades.id, celebracoes.comunidadeId))
    .innerJoin(funcoesEscala, eq(funcoesEscala.id, escalaItens.funcaoId))
    .where(
      and(
        eq(escalaItens.paroquiaId, paroquia.id),
        eq(escalaItens.pessoaId, pessoaId),
        eq(escalas.status, "publicada"),
        eq(celebracoes.status, "agendada"),
        gte(celebracoes.inicio, agora),
      ),
    )
    .orderBy(asc(celebracoes.inicio));

  const abertas = minhas.length
    ? await db
        .select({ id: trocas.id, escalaItemId: trocas.escalaItemId })
        .from(trocas)
        .where(and(eq(trocas.status, "aberta"), inArray(trocas.escalaItemId, minhas.map((m) => m.id))))
    : [];
  const trocaDoItem = new Map(abertas.map((t) => [t.escalaItemId, t.id]));

  // pedidos de outros para funções que eu exerço (e em celebrações onde eu ainda não estou escalado)
  const disponiveis = await db
    .select({
      id: trocas.id,
      funcao: funcoesEscala.nome,
      inicio: celebracoes.inicio,
      comunidade: comunidades.nome,
      solicitante: pessoas.nome,
      celebracaoId: celebracoes.id,
    })
    .from(trocas)
    .innerJoin(escalaItens, eq(escalaItens.id, trocas.escalaItemId))
    .innerJoin(celebracoes, eq(celebracoes.id, escalaItens.celebracaoId))
    .innerJoin(comunidades, eq(comunidades.id, celebracoes.comunidadeId))
    .innerJoin(funcoesEscala, eq(funcoesEscala.id, escalaItens.funcaoId))
    .innerJoin(funcaoMembros, and(eq(funcaoMembros.funcaoId, escalaItens.funcaoId), eq(funcaoMembros.pessoaId, pessoaId)))
    .innerJoin(pessoas, eq(pessoas.id, trocas.solicitantePessoaId))
    .where(
      and(
        eq(trocas.paroquiaId, paroquia.id),
        eq(trocas.status, "aberta"),
        ne(trocas.solicitantePessoaId, pessoaId),
        eq(celebracoes.status, "agendada"),
        gte(celebracoes.inicio, agora),
      ),
    )
    .orderBy(asc(celebracoes.inicio));
  const minhasCelebracoes = new Set(
    (
      await db
        .select({ celebracaoId: escalaItens.celebracaoId })
        .from(escalaItens)
        .where(and(eq(escalaItens.paroquiaId, paroquia.id), eq(escalaItens.pessoaId, pessoaId)))
    ).map((x) => x.celebracaoId),
  );
  const podeAssumir = disponiveis.filter((d) => !minhasCelebracoes.has(d.celebracaoId));

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Minhas escalas</CardTitle>
          <CardDescription>Se não puder comparecer, peça uma troca: quem exerce a mesma função será avisado.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {minhas.map((i, n) => (
            <div key={i.id} className="flex flex-col gap-3">
              {n > 0 && <Separator />}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span>{formatarDataHora(i.inicio, paroquia.fuso)} — {i.comunidade}</span>
                  <Badge variant="secondary">{i.funcao}</Badge>
                </div>
                {trocaDoItem.has(i.id) ? (
                  <form action={cancelarTroca} className="flex items-center gap-2">
                    <input type="hidden" name="trocaId" value={trocaDoItem.get(i.id)} />
                    <Badge>troca solicitada</Badge>
                    <Button type="submit" variant="ghost" size="sm">Cancelar pedido</Button>
                  </form>
                ) : (
                  <PedirTrocaBotao itemId={i.id} />
                )}
              </div>
            </div>
          ))}
          {!minhas.length && <p>Você não tem escalas publicadas.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trocas disponíveis</CardTitle>
          <CardDescription>Pedidos de colegas para funções que você exerce.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {podeAssumir.map((d, n) => (
            <div key={d.id} className="flex flex-col gap-3">
              {n > 0 && <Separator />}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span>{formatarDataHora(d.inicio, paroquia.fuso)} — {d.comunidade}</span>
                  <Badge variant="secondary">{d.funcao}</Badge>
                  <span className="text-sm text-muted-foreground">de {d.solicitante}</span>
                </div>
                <AssumirTrocaBotao trocaId={d.id} />
              </div>
            </div>
          ))}
          {!podeAssumir.length && <p>Nenhuma troca disponível.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <Suspense fallback={<p>Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </main>
  );
}
