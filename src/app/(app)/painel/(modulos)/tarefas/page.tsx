import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireParoquia } from "@/server/auth/session";
import { carregarTarefas } from "@/server/modules/tarefas/queries";
import { hojeNoFuso } from "@/lib/secretaria";
import { Tarefas } from "./Tarefas";

async function Conteudo() {
  const { paroquia, user, pessoaId, pode } = await requireParoquia();
  const gerir = pode("tarefas:gerir");
  if (!gerir && !pode("tarefas:ver")) redirect("/painel");
  const dados = await carregarTarefas({ paroquiaId: paroquia.id, userId: user.id, pessoaId, gerir });
  return <Tarefas {...dados} pessoaId={pessoaId} usuarioId={user.id} gerir={gerir} hoje={hojeNoFuso(paroquia.fuso)} />;
}

export default function Page() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Tarefas</h1>
      <p className="mb-4 text-sm text-muted-foreground">Acompanhe o que a secretaria e as pastorais têm a fazer.</p>
      <Suspense fallback={<p>Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </main>
  );
}
