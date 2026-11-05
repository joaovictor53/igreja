import { Suspense } from "react";
import { and, asc, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { convites, membrosParoquia, pessoas } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { papeisDaParoquia } from "@/server/permissoes";
import { criarPessoa } from "@/server/modules/pessoas/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ConviteButton } from "./convite-button";

async function Conteudo() {
  const { paroquia, pode } = await requireParoquia("pessoas:gerir");
  const [lista, vinculos, pendentes, papeis] = await Promise.all([
    db.select().from(pessoas).where(eq(pessoas.paroquiaId, paroquia.id)).orderBy(asc(pessoas.nome)),
    db.select({ pessoaId: membrosParoquia.pessoaId }).from(membrosParoquia).where(eq(membrosParoquia.paroquiaId, paroquia.id)),
    db
      .select({ pessoaId: convites.pessoaId })
      .from(convites)
      .where(and(eq(convites.paroquiaId, paroquia.id), isNull(convites.usadoEm), isNull(convites.revogadoEm), gt(convites.expiraEm, new Date()))),
    // só quem administra papéis escolhe o papel do convite
    pode("papeis:gerir") ? papeisDaParoquia(paroquia.id) : Promise.resolve(undefined),
  ]);
  const comConvite = new Set(pendentes.map((v) => v.pessoaId));
  const vinculadas = new Set(vinculos.map((v) => v.pessoaId));

  return (
    <>
      <form action={criarPessoa} className="mb-4 flex gap-2">
        <Input name="nome" required placeholder="Nome completo" aria-label="Nome completo" />
        <Button type="submit">Adicionar</Button>
      </form>
      <Card>
        <CardContent className="flex flex-col gap-3">
          {lista.map((p, i) => (
            <div key={p.id} className="flex flex-col gap-3">
              {i > 0 && <Separator />}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <span>{p.nome}</span>
                {vinculadas.has(p.id) ? <Badge variant="secondary">Conta vinculada</Badge> : <ConviteButton pessoaId={p.id} pendente={comConvite.has(p.id)} papeis={papeis} />}
              </div>
            </div>
          ))}
          {!lista.length && <p>Nenhuma pessoa cadastrada.</p>}
        </CardContent>
      </Card>
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Pessoas</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        O convite vale por 7 dias e só pode ser usado uma vez. Envie o link à pessoa.
      </p>
      <Suspense fallback={<p>Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </main>
  );
}
