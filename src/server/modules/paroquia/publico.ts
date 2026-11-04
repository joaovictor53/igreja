import "server-only";
import { and, asc, eq, gte, isNull, lte, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { agendas, celebracoes, comunidades, eventos, formularios, paroquias } from "@/db/schema";

export const SLUGS_RESERVADOS = ["login", "cadastro", "painel", "api", "validar", "f", "convite"];

/** Dados públicos de uma paróquia; nada aqui expõe dados de pessoas. */
export async function getParoquiaPublica(slug: string) {
  const [paroquia] = await db.select().from(paroquias).where(eq(paroquias.slug, slug));
  if (!paroquia) return null;
  const agora = new Date();
  const [coms, celebs, evs, forms] = await Promise.all([
    db.select().from(comunidades).where(eq(comunidades.paroquiaId, paroquia.id)).orderBy(asc(comunidades.nome)),
    db
      .select({
        id: celebracoes.id,
        inicio: celebracoes.inicio,
        tipo: celebracoes.tipo,
        comunidade: comunidades.nome,
      })
      .from(celebracoes)
      .innerJoin(comunidades, eq(comunidades.id, celebracoes.comunidadeId))
      .where(
        and(
          eq(celebracoes.paroquiaId, paroquia.id),
          gte(celebracoes.inicio, agora),
          ne(celebracoes.status, "cancelada"),
        ),
      )
      .orderBy(asc(celebracoes.inicio))
      .limit(100),
    db
      .select({ id: eventos.id, titulo: eventos.titulo, local: eventos.local, inicio: eventos.inicio, fim: eventos.fim })
      .from(eventos)
      .innerJoin(agendas, eq(agendas.id, eventos.agendaId))
      .where(
        and(
          eq(eventos.paroquiaId, paroquia.id),
          eq(agendas.visibilidade, "publica"),
          gte(eventos.inicio, agora),
        ),
      )
      .orderBy(asc(eventos.inicio))
      .limit(100),
    db
      .select({ id: formularios.id, titulo: formularios.titulo })
      .from(formularios)
      .where(
        and(
          eq(formularios.paroquiaId, paroquia.id),
          eq(formularios.ativo, true),
          or(isNull(formularios.abreEm), lte(formularios.abreEm, agora)),
          or(isNull(formularios.fechaEm), gte(formularios.fechaEm, agora)),
        ),
      )
      .orderBy(asc(formularios.titulo)),
  ]);
  return { paroquia, comunidades: coms, celebracoes: celebs, eventos: evs, formularios: forms };
}
