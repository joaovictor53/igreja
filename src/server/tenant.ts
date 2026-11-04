import "server-only";
import { and, eq } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { db } from "@/db";

/** Garante que um id vindo do cliente pertence à paróquia do usuário. */
export async function exigirDaParoquia(
  tabela: PgTable & { id: PgColumn; paroquiaId: PgColumn },
  id: string,
  paroquiaId: string,
) {
  const [r] = await db
    .select({ id: tabela.id })
    .from(tabela as PgTable)
    .where(and(eq(tabela.id, id), eq(tabela.paroquiaId, paroquiaId)));
  if (!r) throw new Error("Registro não encontrado");
}
