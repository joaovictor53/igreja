import { Suspense } from "react";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { celebracoes, comunidades, intencoes } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { excluirIntencao } from "@/server/modules/intencoes/actions";
import { formatarDataHora } from "@/lib/datas";
import { TIPOS } from "@/lib/intencoes";
import { Button } from "@/components/ui/button";
import { IntencaoForm } from "./form";
import { PrintButton } from "./print-button";

async function Conteudo({ params }: { params: Promise<{ celebracaoId: string }> }) {
  const { celebracaoId } = await params;
  if (!z.uuid().safeParse(celebracaoId).success) notFound();
  const { paroquia } = await requireParoquia(["admin", "paroco", "secretaria"]);
  const [cel] = await db
    .select({ id: celebracoes.id, inicio: celebracoes.inicio, comunidade: comunidades.nome, limite: celebracoes.limiteIntencoes })
    .from(celebracoes)
    .innerJoin(comunidades, eq(comunidades.id, celebracoes.comunidadeId))
    .where(and(eq(celebracoes.id, celebracaoId), eq(celebracoes.paroquiaId, paroquia.id)));
  if (!cel) notFound();

  const lista = await db
    .select()
    .from(intencoes)
    .where(and(eq(intencoes.celebracaoId, cel.id), eq(intencoes.paroquiaId, paroquia.id)))
    .orderBy(asc(intencoes.createdAt));

  return (
    <>
      <header className="mb-2">
        <h1 className="text-2xl font-semibold">Intenções de missa</h1>
        <p>
          {formatarDataHora(cel.inicio, paroquia.fuso)} — {cel.comunidade} — {paroquia.nome}
        </p>
        {cel.limite && <p className="text-sm print:hidden">{lista.length} de {cel.limite} intenções</p>}
      </header>
      <IntencaoForm celebracaoId={cel.id} />
      <PrintButton />
      {Object.entries(TIPOS).map(([tipo, nome]) => {
        const itens = lista.filter((i) => i.tipo === tipo);
        if (!itens.length) return null;
        return (
          <section key={tipo} className="mt-4 break-inside-avoid">
            <h2 className="font-semibold">{nome}</h2>
            <ul className="list-disc pl-6">
              {itens.map((i) => (
                <li key={i.id}>
                  {i.texto}
                  {i.solicitanteNome && <span className="text-sm"> (pedido de {i.solicitanteNome})</span>}
                  <form action={excluirIntencao} className="ml-2 inline print:hidden">
                    <input type="hidden" name="id" value={i.id} />
                    <Button type="submit" variant="destructive" size="xs">Excluir</Button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {!lista.length && <p className="mt-4">Nenhuma intenção registrada.</p>}
    </>
  );
}

export default function Page({ params }: PageProps<"/painel/liturgia/intencoes/[celebracaoId]">) {
  return (
    <main className="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <Suspense fallback={<p>Carregando…</p>}>
        <Conteudo params={params} />
      </Suspense>
    </main>
  );
}
