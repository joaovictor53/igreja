import { Suspense } from "react";
import { requireUser } from "@/server/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NovaParoquiaForm } from "./form";

async function Guard() {
  await requireUser();
  return <NovaParoquiaForm />;
}

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-md p-6">
      <Card>
        <CardHeader>
          <CardTitle>Cadastrar paróquia</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p>Carregando…</p>}>
            <Guard />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
