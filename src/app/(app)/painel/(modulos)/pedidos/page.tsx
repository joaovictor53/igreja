import { Suspense } from "react";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { membrosParoquia, pedidosPastorais, user as usuarios } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { atualizarPedido } from "@/server/modules/pedidos/actions";
import { STATUS_PEDIDO, TIPOS_PEDIDO } from "@/lib/pedidos";
import { formatarDataHora } from "@/lib/datas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

async function Conteudo() {
  const { paroquia } = await requireParoquia(["admin", "paroco", "secretaria"]);
  const [lista, responsaveis] = await Promise.all([
    db.select().from(pedidosPastorais).where(eq(pedidosPastorais.paroquiaId, paroquia.id)).orderBy(desc(pedidosPastorais.createdAt)).limit(200),
    db
      .select({ id: usuarios.id, nome: usuarios.name })
      .from(membrosParoquia)
      .innerJoin(usuarios, eq(usuarios.id, membrosParoquia.usuarioId))
      .where(and(eq(membrosParoquia.paroquiaId, paroquia.id), inArray(membrosParoquia.papel, ["admin", "paroco"]))),
  ]);
  const abertos = (p: (typeof lista)[number]) => p.status === "novo" || p.status === "em_andamento";
  // urgentes em aberto primeiro, depois por data
  const ordenados = [...lista].sort(
    (a, b) => Number(abertos(b) && b.urgente) - Number(abertos(a) && a.urgente) || Number(abertos(b)) - Number(abertos(a)),
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Link público para divulgar: <a className="underline" href={`/${paroquia.slug}/pedido`}>/{paroquia.slug}/pedido</a>
      </p>
      {ordenados.map((p) => (
        <Card key={p.id} className={abertos(p) && p.urgente ? "ring-2 ring-destructive" : undefined}>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <strong>{TIPOS_PEDIDO[p.tipo]}</strong>
              {p.urgente && <Badge variant="destructive">URGENTE</Badge>}
              <Badge variant="secondary">{STATUS_PEDIDO[p.status]}</Badge>
              <span className="text-sm text-muted-foreground">{formatarDataHora(p.createdAt, paroquia.fuso)}</span>
            </div>
            <p className="text-sm">
              {p.solicitanteNome} — <a className="underline" href={`tel:${p.contato}`}>{p.contato}</a>
              {p.endereco && <> — {p.endereco}</>}
            </p>
            {p.descricao && <p className="text-sm">{p.descricao}</p>}
            <form action={atualizarPedido} className="flex flex-wrap gap-2">
              <input type="hidden" name="id" value={p.id} />
              <NativeSelect name="status" size="sm" defaultValue={p.status} aria-label="Status">
                {Object.entries(STATUS_PEDIDO).map(([k, n]) => <NativeSelectOption key={k} value={k}>{n}</NativeSelectOption>)}
              </NativeSelect>
              <NativeSelect name="atribuidoA" size="sm" defaultValue={p.atribuidoA ?? ""} aria-label="Responsável">
                <NativeSelectOption value="">— sem responsável —</NativeSelectOption>
                {responsaveis.map((r) => <NativeSelectOption key={r.id} value={r.id}>{r.nome}</NativeSelectOption>)}
              </NativeSelect>
              <Button type="submit" variant="outline" size="sm">Salvar</Button>
            </form>
          </CardContent>
        </Card>
      ))}
      {!ordenados.length && <p>Nenhum pedido recebido.</p>}
    </div>
  );
}

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <h1 className="mb-2 text-2xl font-semibold">Pedidos pastorais</h1>
      <Suspense fallback={<p>Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </main>
  );
}
