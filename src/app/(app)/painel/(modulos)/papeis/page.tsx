import { Suspense } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { membrosParoquia, papeis, user as usuarios } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { NOMES_PAPEL, PAPEIS, permissoesPadrao, permissoesValidas } from "@/lib/permissoes";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EditarPapel, NovoPapel, PapelDoMembro } from "./forms";

async function Conteudo() {
  const { paroquia, user } = await requireParoquia("papeis:gerir");
  const [linhas, membros] = await Promise.all([
    db.select().from(papeis).where(eq(papeis.paroquiaId, paroquia.id)).orderBy(asc(papeis.createdAt)),
    db
      .select({ id: membrosParoquia.id, usuarioId: membrosParoquia.usuarioId, papel: membrosParoquia.papel, nome: usuarios.name, email: usuarios.email })
      .from(membrosParoquia)
      .innerJoin(usuarios, eq(usuarios.id, membrosParoquia.usuarioId))
      .where(eq(membrosParoquia.paroquiaId, paroquia.id))
      .orderBy(asc(usuarios.name)),
  ]);
  const personalizados = new Map(linhas.map((l) => [l.chave, l]));
  const editaveis = PAPEIS.filter((p) => p !== "admin").map((chave) => {
    const linha = personalizados.get(chave);
    return {
      chave,
      nome: NOMES_PAPEL[chave],
      sistema: true,
      personalizado: !!linha,
      permissoes: linha ? permissoesValidas(linha.permissoes) : permissoesPadrao(chave),
    };
  });
  const criados = linhas
    .filter((l) => !(PAPEIS as readonly string[]).includes(l.chave))
    .map((l) => ({ chave: l.chave, nome: l.nome, sistema: false, personalizado: true, permissoes: permissoesValidas(l.permissoes) }));
  const opcoes = [
    { chave: "admin", nome: NOMES_PAPEL.admin },
    ...[...editaveis, ...criados].map((p) => ({ chave: p.chave, nome: p.nome })),
  ];
  const nomeDe = new Map(opcoes.map((o) => [o.chave, o.nome]));

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Membros</CardTitle>
          <CardDescription>Escolha o papel de cada conta. Você não pode mudar o seu próprio papel.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {membros.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{m.nome}{m.usuarioId === user.id && " (você)"}</p>
                <p className="truncate text-sm text-muted-foreground">{m.email}</p>
              </div>
              <PapelDoMembro membroId={m.id} papel={m.papel} opcoes={opcoes} voce={m.usuarioId === user.id} />
            </div>
          ))}
          {!membros.length && <p>Nenhuma conta vinculada.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">{NOMES_PAPEL.admin} <Badge variant="secondary">Acesso total</Badge></CardTitle>
          <CardDescription>O administrador sempre tem todas as permissões e não pode ser editado.</CardDescription>
        </CardHeader>
      </Card>

      {[...editaveis, ...criados].map((p) => (
        <Card key={p.chave}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              {nomeDe.get(p.chave)}
              {p.sistema && <Badge variant="secondary">{p.personalizado ? "Personalizado" : "Padrão"}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EditarPapel {...p} />
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Novo papel</CardTitle>
          <CardDescription>Crie um papel com as permissões que quiser e depois atribua-o aos membros.</CardDescription>
        </CardHeader>
        <CardContent>
          <NovoPapel />
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Papéis e acessos</h1>
      <p className="mb-4 text-sm text-muted-foreground">Defina o que cada papel pode fazer e quem tem cada papel.</p>
      <Suspense fallback={<p>Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </main>
  );
}
