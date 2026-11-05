import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { asc, eq, sql } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db } from "@/db";
import { membrosParoquia, paroquias } from "@/db/schema";

export type Papel = (typeof membrosParoquia.$inferSelect)["papel"];

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Exige usuário logado; redireciona para /login caso contrário. */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.user;
}

/**
 * Contexto de tenant: a paróquia vem do vínculo do usuário no servidor,
 * nunca do cliente. Sem vínculo, vai para o onboarding.
 */
export async function requireParoquia(papeisPermitidos?: Papel[]) {
  const user = await requireUser();
  const [row] = await db
    .select({ paroquia: paroquias, papel: membrosParoquia.papel, pessoaId: membrosParoquia.pessoaId })
    .from(membrosParoquia)
    .innerJoin(paroquias, eq(paroquias.id, membrosParoquia.paroquiaId))
    .where(eq(membrosParoquia.usuarioId, user.id))
    // Ordem estável para quem está em mais de uma paróquia: vínculos de gestão antes dos de "membro", depois o mais antigo.
    .orderBy(sql`(${membrosParoquia.papel} = 'membro')`, asc(membrosParoquia.createdAt))
    .limit(1);
  if (!row) redirect("/painel/nova-paroquia");
  if (papeisPermitidos && !papeisPermitidos.includes(row.papel)) redirect("/painel");
  return { user, paroquia: row.paroquia, papel: row.papel, pessoaId: row.pessoaId };
}
