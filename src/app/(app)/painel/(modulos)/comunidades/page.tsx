import { Suspense } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { comunidades } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LinhaComunidade, NovaComunidade } from "./forms";

async function Conteudo() {
  const { paroquia } = await requireParoquia(["admin", "paroco", "secretaria"]);
  const lista = await db.select().from(comunidades).where(eq(comunidades.paroquiaId, paroquia.id)).orderBy(asc(comunidades.nome));

  return (
    <>
      <div className="my-4">
        <NovaComunidade />
      </div>
      <Card>
        <CardContent className="flex flex-col gap-3">
          {lista.map((c, i) => (
            <div key={c.id} className="flex flex-col gap-3">
              {i > 0 && <Separator />}
              <LinhaComunidade id={c.id} nome={c.nome} endereco={c.endereco} />
            </div>
          ))}
          {!lista.length && <p>Nenhuma comunidade cadastrada.</p>}
        </CardContent>
      </Card>
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Comunidades</h1>
      <p className="text-sm text-muted-foreground">
        Matriz, capelas e áreas missionárias. Horários de missa, catequese e datas de batizados e casamentos são ligados a uma comunidade.
      </p>
      <Suspense fallback={<p>Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </main>
  );
}
