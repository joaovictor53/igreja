import { Suspense } from "react";
import Link from "next/link";
import { and, asc, count, eq, gte, inArray, isNull, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  agendamentosSacramento,
  celebracoes,
  comunidades,
  datasSacramento,
  eventos,
  intencoes,
  pedidosPastorais,
  respostas,
  tarefas,
} from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { zonedToUtc } from "@/lib/datas";
import { hojeNoFuso, tarefaAtrasada, versiculoDoDia } from "@/lib/secretaria";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const PAPEIS_SECRETARIA = ["admin", "paroco", "secretaria"];

async function Resumo() {
  const { paroquia, papel, user } = await requireParoquia();
  const hoje = hojeNoFuso(paroquia.fuso);
  const [y, m, d] = hoje.split("-").map(Number);
  const fuso = paroquia.fuso;
  const inicioDia = zonedToUtc(y, m, d, 0, 0, fuso);
  const fimDia = zonedToUtc(y, m, d + 1, 0, 0, fuso);
  const inicioMes = zonedToUtc(y, m, 1, 0, 0, fuso);
  const fimMes = zonedToUtc(y, m + 1, 1, 0, 0, fuso);
  const { texto, ref } = versiculoDoDia(hoje);
  const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, hour: "2-digit", minute: "2-digit" });
  const dataLonga = new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, dateStyle: "full" }).format(new Date());
  const saudacao = Number(new Intl.DateTimeFormat("en-US", { timeZone: fuso, hour: "numeric", hourCycle: "h23" }).format(new Date()));
  const periodo = saudacao < 12 ? "Bom dia" : saudacao < 18 ? "Boa tarde" : "Boa noite";

  const cabecalho = (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">
          {periodo}, {user.name.split(" ")[0]}!
        </CardTitle>
        <CardDescription className="flex flex-col gap-1">
          <span className="flex items-center gap-2">
            {paroquia.nome} · {dataLonga} <Badge variant="secondary">{papel}</Badge>
          </span>
          <span className="italic">
            “{texto}” — {ref}
          </span>
        </CardDescription>
      </CardHeader>
    </Card>
  );
  if (!PAPEIS_SECRETARIA.includes(papel)) return cabecalho;

  const pid = paroquia.id;
  const [[eventosMes], [intencoesMes], [sacramentosMarcados], [inscricoesNovas], celsHoje, eventosHoje, abertas, pedidos] =
    await Promise.all([
      db.select({ n: count() }).from(eventos).where(and(eq(eventos.paroquiaId, pid), gte(eventos.inicio, inicioMes), lt(eventos.inicio, fimMes))),
      db
        .select({ n: count() })
        .from(intencoes)
        .innerJoin(celebracoes, eq(celebracoes.id, intencoes.celebracaoId))
        .where(and(eq(intencoes.paroquiaId, pid), gte(celebracoes.inicio, inicioMes), lt(celebracoes.inicio, fimMes))),
      db
        .select({ n: count() })
        .from(agendamentosSacramento)
        .innerJoin(datasSacramento, eq(datasSacramento.id, agendamentosSacramento.dataId))
        .where(
          and(
            eq(agendamentosSacramento.paroquiaId, pid),
            inArray(agendamentosSacramento.status, ["solicitado", "confirmado"]),
            gte(datasSacramento.inicio, inicioDia),
          ),
        ),
      db.select({ n: count() }).from(respostas).where(and(eq(respostas.paroquiaId, pid), eq(respostas.status, "nova"))),
      db
        .select({ id: celebracoes.id, inicio: celebracoes.inicio, comunidade: comunidades.nome })
        .from(celebracoes)
        .innerJoin(comunidades, eq(comunidades.id, celebracoes.comunidadeId))
        .where(and(eq(celebracoes.paroquiaId, pid), ne(celebracoes.status, "cancelada"), gte(celebracoes.inicio, inicioDia), lt(celebracoes.inicio, fimDia)))
        .orderBy(asc(celebracoes.inicio)),
      db
        .select({ id: eventos.id, titulo: eventos.titulo, local: eventos.local, inicio: eventos.inicio })
        .from(eventos)
        .where(and(eq(eventos.paroquiaId, pid), isNull(eventos.celebracaoId), gte(eventos.inicio, inicioDia), lt(eventos.inicio, fimDia)))
        .orderBy(asc(eventos.inicio)),
      db.select().from(tarefas).where(and(eq(tarefas.paroquiaId, pid), isNull(tarefas.concluidaEm))).orderBy(asc(tarefas.prazo)),
      db
        .select()
        .from(pedidosPastorais)
        .where(and(eq(pedidosPastorais.paroquiaId, pid), eq(pedidosPastorais.status, "novo")))
        .orderBy(asc(pedidosPastorais.createdAt)),
    ]);

  const intencoesPorCelebracao = celsHoje.length
    ? await db
        .select({ celebracaoId: intencoes.celebracaoId, n: count() })
        .from(intencoes)
        .where(and(eq(intencoes.paroquiaId, pid), inArray(intencoes.celebracaoId, celsHoje.map((c) => c.id))))
        .groupBy(intencoes.celebracaoId)
    : [];
  const nIntencoes = new Map(intencoesPorCelebracao.map((i) => [i.celebracaoId, i.n]));
  const tarefasUrgentes = abertas.filter((t) => t.prazo && t.prazo <= hoje);

  const numeros = [
    ["Eventos no mês", eventosMes.n],
    ["Intenções no mês", intencoesMes.n],
    ["Batizados e casamentos marcados", sacramentosMarcados.n],
    ["Inscrições novas", inscricoesNovas.n],
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      {cabecalho}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {numeros.map(([rotulo, valor]) => (
          <Card key={rotulo}>
            <CardContent>
              <p className="text-2xl font-semibold">{valor}</p>
              <p className="text-sm text-muted-foreground">{rotulo}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agenda de hoje</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {celsHoje.map((c) => (
            <Link key={c.id} href={`/painel/liturgia/intencoes/${c.id}`} className="flex justify-between gap-3 hover:underline">
              <span>
                {hora.format(c.inicio)} · Missa — {c.comunidade}
              </span>
              <span className="text-sm text-muted-foreground">{nIntencoes.get(c.id) ?? 0} intenções</span>
            </Link>
          ))}
          {eventosHoje.map((e) => (
            <div key={e.id} className="flex justify-between gap-3">
              <span>
                {hora.format(e.inicio)} · {e.titulo}
              </span>
              {e.local && <span className="text-sm text-muted-foreground">{e.local}</span>}
            </div>
          ))}
          {!celsHoje.length && !eventosHoje.length && <p className="text-sm text-muted-foreground">Nada marcado para hoje.</p>}
          <Link href="/painel/agenda" className="text-sm underline">Ver agenda</Link>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tarefas que pedem atenção</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {tarefasUrgentes.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2">
                <span>{t.titulo}</span>
                <Badge variant={tarefaAtrasada(t.prazo, false, hoje) ? "destructive" : "secondary"}>
                  {tarefaAtrasada(t.prazo, false, hoje) ? "Atrasada" : "Hoje"}
                </Badge>
              </div>
            ))}
            {!tarefasUrgentes.length && <p className="text-sm text-muted-foreground">Nenhuma tarefa atrasada.</p>}
            <Link href="/painel/tarefas" className="text-sm underline">Ver tarefas</Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pedidos para responder</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {pedidos.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2">
                <span>{p.solicitanteNome}</span>
                {p.urgente && <Badge variant="destructive">Urgente</Badge>}
              </div>
            ))}
            {!pedidos.length && <p className="text-sm text-muted-foreground">Nenhum pedido novo.</p>}
            <Link href="/painel/pedidos" className="text-sm underline">Ver pedidos</Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-4xl p-6">
      <Suspense fallback={<p>Carregando…</p>}>
        <Resumo />
      </Suspense>
    </main>
  );
}
