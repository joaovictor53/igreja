import { Suspense } from "react";
import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { formularios, respostas } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { criarFormulario } from "@/server/modules/inscricoes/actions";
import { MODELOS } from "@/lib/formularios";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";

async function Conteudo() {
  const { paroquia } = await requireParoquia(["admin", "paroco", "secretaria"]);
  const lista = await db
    .select({ f: formularios, respostas: count(respostas.id) })
    .from(formularios)
    .leftJoin(respostas, eq(respostas.formularioId, formularios.id))
    .where(eq(formularios.paroquiaId, paroquia.id))
    .groupBy(formularios.id)
    .orderBy(desc(formularios.createdAt));

  return (
    <>
      <form action={criarFormulario} className="my-4 flex flex-wrap gap-2">
        <NativeSelect name="modelo" aria-label="Modelo">
          {Object.entries(MODELOS).map(([k, m]) => (
            <NativeSelectOption key={k} value={k}>{k === "em_branco" ? "Em branco" : m.titulo}</NativeSelectOption>
          ))}
        </NativeSelect>
        <Input name="titulo" placeholder="Título (opcional)" aria-label="Título" className="max-w-xs" />
        <Button type="submit">Criar formulário</Button>
      </form>
      <Card>
        <CardContent className="flex flex-col gap-3">
          {lista.map(({ f, respostas: n }, i) => (
            <div key={f.id} className="flex flex-col gap-3">
              {i > 0 && <Separator />}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  {f.titulo}
                  <Badge variant={f.ativo ? "default" : "secondary"}>{f.ativo ? "aberto" : "fechado"}</Badge>
                </span>
                <Link href={`/painel/inscricoes/${f.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Respostas ({n})
                </Link>
              </div>
            </div>
          ))}
          {!lista.length && <p>Nenhum formulário criado.</p>}
        </CardContent>
      </Card>
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Inscrições</h1>
      <p className="text-sm text-muted-foreground">Crie um formulário a partir de um modelo e divulgue o link ou o QR Code.</p>
      <Suspense fallback={<p>Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </main>
  );
}
