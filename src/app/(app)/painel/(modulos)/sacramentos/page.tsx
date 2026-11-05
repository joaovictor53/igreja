import { Suspense } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { agendamentosSacramento, comunidades, datasSacramento } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import {
  abrirData,
  alternarCurso,
  alternarDocumento,
  criarAgendamento,
  excluirData,
  mudarStatusAgendamento,
} from "@/server/modules/sacramentos/actions";
import { formatarDataHora } from "@/lib/datas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

const TIPO = { batizado: "Batizado", casamento: "Casamento" } as const;
const STATUS = ["solicitado", "confirmado", "realizado", "cancelado"] as const;

async function Conteudo() {
  const { paroquia } = await requireParoquia("sacramentos:gerir");
  const [datas, agendados, comunidadesLista] = await Promise.all([
    db.select().from(datasSacramento).where(eq(datasSacramento.paroquiaId, paroquia.id)).orderBy(asc(datasSacramento.inicio)),
    db.select().from(agendamentosSacramento).where(eq(agendamentosSacramento.paroquiaId, paroquia.id)).orderBy(asc(agendamentosSacramento.createdAt)),
    db.select().from(comunidades).where(eq(comunidades.paroquiaId, paroquia.id)).orderBy(asc(comunidades.nome)),
  ]);
  const nomeComunidade = new Map(comunidadesLista.map((c) => [c.id, c.nome]));

  return (
    <>
      <form action={abrirData} className="my-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:grid-cols-5">
        <Label className="flex-col items-stretch">
          Tipo
          <NativeSelect name="tipo" className="w-full">
            <NativeSelectOption value="batizado">Batizado</NativeSelectOption>
            <NativeSelectOption value="casamento">Casamento</NativeSelectOption>
          </NativeSelect>
        </Label>
        <Label className="flex-col items-stretch">
          Data
          <Input name="data" type="date" required />
        </Label>
        <Label className="flex-col items-stretch">
          Hora
          <Input name="hora" type="time" required />
        </Label>
        <Label className="flex-col items-stretch">
          Vagas
          <Input name="vagas" type="number" min={1} max={50} defaultValue={1} />
        </Label>
        <Label className="flex-col items-stretch">
          Comunidade
          <NativeSelect name="comunidadeId" className="w-full">
            <NativeSelectOption value="">Qualquer</NativeSelectOption>
            {comunidadesLista.map((c) => <NativeSelectOption key={c.id} value={c.id}>{c.nome}</NativeSelectOption>)}
          </NativeSelect>
        </Label>
        <Button type="submit" className="col-span-2 sm:col-span-5">Abrir data</Button>
      </form>

      <div className="flex flex-col gap-4">
        {datas.map((dt) => {
          const meus = agendados.filter((a) => a.dataId === dt.id);
          const ocupadas = meus.filter((a) => a.status !== "cancelado").length;
          return (
            <Card key={dt.id}>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <strong>{TIPO[dt.tipo]}</strong> — {formatarDataHora(dt.inicio, paroquia.fuso)}
                    {dt.comunidadeId && ` — ${nomeComunidade.get(dt.comunidadeId)}`}
                    <p className="text-sm text-muted-foreground">{ocupadas} de {dt.vagas} vaga(s) ocupada(s)</p>
                  </div>
                  <form action={excluirData}>
                    <input type="hidden" name="id" value={dt.id} />
                    <Button type="submit" variant="destructive" size="sm">Excluir data</Button>
                  </form>
                </div>

                {meus.map((a) => {
                  const faltam = a.documentos.filter((d) => !d.feito).length;
                  return (
                    <div key={a.id} className="flex flex-col gap-2 rounded-lg border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          <strong>{a.envolvidos}</strong> <span className="text-sm text-muted-foreground">· {a.contato}</span>
                        </span>
                        <form action={mudarStatusAgendamento} className="flex items-center gap-2">
                          <input type="hidden" name="id" value={a.id} />
                          <NativeSelect name="status" defaultValue={a.status} size="sm" aria-label="Situação">
                            {STATUS.map((s) => <NativeSelectOption key={s} value={s}>{s}</NativeSelectOption>)}
                          </NativeSelect>
                          <Button type="submit" variant="outline" size="sm">Salvar</Button>
                        </form>
                      </div>
                      <ul className="flex flex-col gap-1">
                        {a.documentos.map((d, i) => (
                          <li key={i}>
                            <form action={alternarDocumento}>
                              <input type="hidden" name="id" value={a.id} />
                              <input type="hidden" name="indice" value={i} />
                              <button type="submit" className="text-left text-sm">
                                {d.feito ? "☑" : "☐"} {d.texto}
                              </button>
                            </form>
                          </li>
                        ))}
                      </ul>
                      <div className="flex flex-wrap items-center gap-2">
                        {faltam > 0 ? (
                          <Badge variant="destructive">{faltam} documento(s) pendente(s)</Badge>
                        ) : (
                          <Badge variant="secondary">Documentos completos</Badge>
                        )}
                        <form action={alternarCurso}>
                          <input type="hidden" name="id" value={a.id} />
                          <Button type="submit" variant="outline" size="sm">
                            {a.cursoConcluido ? "☑ Curso de preparação concluído" : "☐ Curso de preparação pendente"}
                          </Button>
                        </form>
                      </div>
                    </div>
                  );
                })}

                {ocupadas < dt.vagas && (
                  <form action={criarAgendamento} className="flex flex-wrap gap-2">
                    <input type="hidden" name="dataId" value={dt.id} />
                    <Input
                      name="envolvidos"
                      required
                      placeholder={dt.tipo === "batizado" ? "Nome da criança" : "Nome dos noivos"}
                      aria-label="Envolvidos"
                      className="min-w-48 flex-1"
                    />
                    <Input name="contato" required placeholder="Telefone" aria-label="Telefone" className="w-40" />
                    <Button type="submit" variant="outline">Agendar</Button>
                  </form>
                )}
              </CardContent>
            </Card>
          );
        })}
        {!datas.length && <p>Nenhuma data aberta.</p>}
      </div>
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Batizados e casamentos</h1>
      <p className="text-sm text-muted-foreground">
        Abra as datas disponíveis, agende e acompanhe os documentos e o curso de preparação.
      </p>
      <Suspense fallback={<p>Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </main>
  );
}
