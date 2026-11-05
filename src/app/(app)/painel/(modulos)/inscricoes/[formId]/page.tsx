import { Suspense } from "react";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { formularios, respostas } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import {
  alterarStatusResposta,
  atualizarConfig,
  converterEmPessoa,
  removerCampo,
} from "@/server/modules/inscricoes/actions";
import { CampoForm } from "./campo-form";
import { TIPOS_CAMPO } from "@/lib/formularios";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

const STATUS = { nova: "Nova", em_analise: "Em análise", aceita: "Aceita", recusada: "Recusada" } as const;

/** Valor de <input type="datetime-local"> no fuso da paróquia. */
function paraInput(d: Date | null, tz: string) {
  if (!d) return "";
  const p = new Intl.DateTimeFormat("sv-SE", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(d);
  return p.replace(" ", "T");
}

async function Conteudo({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params;
  if (!z.uuid().safeParse(formId).success) notFound();
  const { paroquia } = await requireParoquia("inscricoes:gerir");
  const [f] = await db
    .select()
    .from(formularios)
    .where(and(eq(formularios.id, formId), eq(formularios.paroquiaId, paroquia.id)));
  if (!f) notFound();

  const lista = await db
    .select()
    .from(respostas)
    .where(and(eq(respostas.formularioId, f.id), eq(respostas.paroquiaId, paroquia.id)))
    .orderBy(desc(respostas.createdAt))
    .limit(200);

  const origem = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const url = `${origem}/f/${f.id}`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 1, width: 128 });
  const rotulo = new Map(f.campos.map((c) => [c.id, c.rotulo]));
  const formatar = (v: unknown) => (Array.isArray(v) ? v.join(", ") : typeof v === "boolean" ? (v ? "sim" : "não") : String(v));

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Divulgação</CardTitle>
          <CardDescription>
            <a className="underline" href={`/f/${f.id}`}>{url}</a>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-start gap-6">
          <div role="img" aria-label={`QR Code para ${url}`} dangerouslySetInnerHTML={{ __html: qr }} />
          <form action={atualizarConfig} className="grid flex-1 grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="hidden" name="formularioId" value={f.id} />
            <Label className="flex-col items-stretch">
              Abre em
              <Input name="abreEm" type="datetime-local" defaultValue={paraInput(f.abreEm, paroquia.fuso)} />
            </Label>
            <Label className="flex-col items-stretch">
              Fecha em
              <Input name="fechaEm" type="datetime-local" defaultValue={paraInput(f.fechaEm, paroquia.fuso)} />
            </Label>
            <Label className="flex-col items-stretch">
              Limite de vagas
              <Input name="limite" type="number" min={1} defaultValue={f.limite ?? ""} />
            </Label>
            <Label className="self-end font-normal">
              <input type="checkbox" name="ativo" defaultChecked={f.ativo} /> Aceitando inscrições
            </Label>
            <Button type="submit" variant="outline" className="col-span-2 w-fit">Salvar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Campos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="flex flex-col gap-2">
            {f.campos.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  {c.rotulo}
                  <Badge variant="secondary">{TIPOS_CAMPO[c.tipo]}</Badge>
                  {c.obrigatorio && <Badge variant="outline">obrigatório</Badge>}
                </span>
                <form action={removerCampo}>
                  <input type="hidden" name="formularioId" value={f.id} />
                  <input type="hidden" name="campoId" value={c.id} />
                  <Button type="submit" variant="destructive" size="xs">Remover</Button>
                </form>
              </li>
            ))}
          </ul>
          <CampoForm formularioId={f.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Respostas ({lista.length})</CardTitle>
          <a href={`/api/inscricoes/${f.id}/csv`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Exportar CSV
          </a>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {lista.map((r) => (
            <div key={r.id} className="rounded-lg border p-3">
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                {Object.entries(r.dados).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-muted-foreground">{rotulo.get(k) ?? k}</dt>
                    <dd>{formatar(v)}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant={r.status === "nova" ? "default" : "secondary"}>{STATUS[r.status]}</Badge>
                <form action={alterarStatusResposta} className="flex gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <NativeSelect name="status" size="sm" defaultValue={r.status} aria-label="Status">
                    {Object.entries(STATUS).map(([k, n]) => <NativeSelectOption key={k} value={k}>{n}</NativeSelectOption>)}
                  </NativeSelect>
                  <Button type="submit" variant="outline" size="sm">Salvar</Button>
                </form>
                {r.pessoaId ? (
                  <Badge variant="secondary">Cadastrada em Pessoas</Badge>
                ) : (
                  <form action={converterEmPessoa}>
                    <input type="hidden" name="id" value={r.id} />
                    <Button type="submit" variant="outline" size="sm">Criar cadastro de pessoa</Button>
                  </form>
                )}
              </div>
            </div>
          ))}
          {!lista.length && <p>Nenhuma resposta ainda.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page({ params }: PageProps<"/painel/inscricoes/[formId]">) {
  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <Suspense fallback={<p>Carregando…</p>}>
        <Conteudo params={params} />
      </Suspense>
    </main>
  );
}
