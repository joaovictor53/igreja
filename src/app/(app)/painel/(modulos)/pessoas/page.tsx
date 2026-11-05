import { Suspense } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { membrosParoquia, pessoas } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { criarPessoa } from "@/server/modules/pessoas/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ConviteButton } from "./convite-button";

async function Conteudo() {
  const { paroquia } = await requireParoquia(["admin", "paroco", "secretaria"]);
  const [lista, vinculos] = await Promise.all([
    db.select().from(pessoas).where(eq(pessoas.paroquiaId, paroquia.id)).orderBy(asc(pessoas.nome)),
    db.select({ pessoaId: membrosParoquia.pessoaId }).from(membrosParoquia).where(eq(membrosParoquia.paroquiaId, paroquia.id)),
  ]);
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
                {vinculadas.has(p.id) ? <Badge variant="secondary">Conta vinculada</Badge> : <ConviteButton pessoaId={p.id} />}
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
