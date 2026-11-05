import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { assentoPessoas, assentos, averbacoes, certidoes, livros } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { adicionarAverbacao, emitirCertidao, revogarCertidao } from "@/server/modules/registros/actions";
import { NOMES_PAPEL, NOMES_TIPO, nomePrincipal } from "@/lib/registros";
import { formatarDataHora } from "@/lib/datas";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const br = (iso: string) => iso.split("-").reverse().join("/");

async function Conteudo({ params }: { params: Promise<{ assentoId: string }> }) {
  const { assentoId } = await params;
  if (!z.uuid().safeParse(assentoId).success) notFound();
  const { paroquia } = await requireParoquia("registros:gerir");
  const [row] = await db
    .select({ a: assentos, livro: livros })
    .from(assentos)
    .innerJoin(livros, eq(livros.id, assentos.livroId))
    .where(and(eq(assentos.id, assentoId), eq(assentos.paroquiaId, paroquia.id)));
  if (!row) notFound();
  const { a, livro } = row;

  const [pessoas, avs, certs] = await Promise.all([
    db.select().from(assentoPessoas).where(eq(assentoPessoas.assentoId, a.id)),
    db.select().from(averbacoes).where(eq(averbacoes.assentoId, a.id)).orderBy(asc(averbacoes.data)),
    db.select().from(certidoes).where(eq(certidoes.assentoId, a.id)).orderBy(desc(certidoes.emitidaEm)),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{nomePrincipal(pessoas, livro.tipo)}</h1>
        <p className="text-muted-foreground">
          {NOMES_TIPO[livro.tipo]} — Livro {livro.numero}, folha {a.folha}, termo {a.termo} — {br(a.data)}
        </p>
        <Link href={`/painel/registros/livros/${livro.id}`} className="text-sm underline">← Livro {livro.numero}</Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pessoas</CardTitle>
          {a.celebrante && <CardDescription>Celebrante: {a.celebrante}</CardDescription>}
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-1">
            {pessoas.map((p) => (
              <li key={p.id}>
                <span className="text-sm text-muted-foreground">{NOMES_PAPEL[p.papel]}:</span> {p.nome}
              </li>
            ))}
          </ul>
          {a.observacoes && <p className="mt-3 text-sm">{a.observacoes}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Averbações</CardTitle>
          <CardDescription>Anotações à margem do assento (ex.: casamento posterior). Entram nas próximas certidões.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {avs.map((v) => (
            <p key={v.id} className="text-sm">
              <strong>{br(v.data)}</strong> — {v.texto}
            </p>
          ))}
          <form action={adicionarAverbacao} className="grid grid-cols-[10rem_1fr_auto] items-end gap-2">
            <input type="hidden" name="assentoId" value={a.id} />
            <Label className="flex-col items-stretch">
              Data
              <Input name="data" type="date" required />
            </Label>
            <Label className="flex-col items-stretch">
              Texto
              <Input name="texto" required minLength={3} maxLength={1000} />
            </Label>
            <Button type="submit" variant="outline">Averbar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Certidões</CardTitle>
          <CardDescription>
            Cada certidão tem um código e um QR Code que levam à página pública de validação.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form action={emitirCertidao} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="assentoId" value={a.id} />
            <Label className="flex-1 flex-col items-stretch">
              Finalidade (opcional)
              <Input name="finalidade" maxLength={200} placeholder="Ex.: matrícula na catequese" />
            </Label>
            <Button type="submit">Emitir certidão</Button>
          </form>
          {certs.map((c, i) => (
            <div key={c.id} className="flex flex-col gap-3">
              {i === 0 && <Separator />}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex flex-wrap items-center gap-2">
                  <code>{c.codigo}</code>
                  <span className="text-sm text-muted-foreground">{formatarDataHora(c.emitidaEm, paroquia.fuso)}</span>
                  {c.finalidade && <span className="text-sm">— {c.finalidade}</span>}
                  {c.revogadaEm ? <Badge variant="destructive">revogada</Badge> : <Badge variant="secondary">válida</Badge>}
                </span>
                <span className="flex items-center gap-2">
                  <a href={`/api/certidoes/${c.codigo}/pdf`} target="_blank" className={buttonVariants({ variant: "outline", size: "sm" })}>
                    PDF
                  </a>
                  <a href={`/validar/${c.codigo}`} target="_blank" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                    Validação
                  </a>
                </span>
              </div>
              {c.revogadaEm ? (
                <p className="text-sm text-muted-foreground">Motivo da revogação: {c.motivoRevogacao}</p>
              ) : (
                <form action={revogarCertidao} className="flex gap-2">
                  <input type="hidden" name="id" value={c.id} />
                  <Input name="motivo" required minLength={3} maxLength={300} placeholder="Motivo para revogar (ex.: emitida com erro)" aria-label="Motivo da revogação" />
                  <Button type="submit" variant="destructive" size="sm" className="self-center">Revogar</Button>
                </form>
              )}
            </div>
          ))}
          {!certs.length && <p className="text-sm text-muted-foreground">Nenhuma certidão emitida.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page({ params }: PageProps<"/painel/registros/assentos/[assentoId]">) {
  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <Suspense fallback={<p>Carregando…</p>}>
        <Conteudo params={params} />
      </Suspense>
    </main>
  );
}
