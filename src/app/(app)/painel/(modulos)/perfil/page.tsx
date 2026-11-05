import { Suspense } from "react";
import { requireParoquia } from "@/server/auth/session";
import { PerfilForm } from "./form";

async function Conteudo() {
  const { user, papel } = await requireParoquia();
  return <PerfilForm nome={user.name} email={user.email} papel={papel} />;
}

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-md p-4 sm:p-6">
      <h1 className="mb-4 text-2xl font-semibold">Meu perfil</h1>
      <Suspense fallback={<p>Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </main>
  );
}
