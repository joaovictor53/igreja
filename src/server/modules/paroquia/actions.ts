"use server";

import { z } from "zod";
import { db } from "@/db";
import { agendas, comunidades, membrosParoquia, paroquias } from "@/db/schema";
import { requireUser } from "@/server/auth/session";
import { SLUGS_RESERVADOS } from "./publico";

const schema = z.object({
  nome: z.string().trim().min(3, "Informe o nome da paróquia"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífens"),
  comunidade: z.string().trim().min(2, "Informe a comunidade matriz"),
});

export type NovaParoquiaState = { erro?: string; ok?: boolean };

export async function criarParoquia(_: NovaParoquiaState, formData: FormData): Promise<NovaParoquiaState> {
  const user = await requireUser();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };
  const { nome, slug, comunidade } = parsed.data;
  if (SLUGS_RESERVADOS.includes(slug)) return { erro: "Este endereço (slug) é reservado" };

  try {
    await db.transaction(async (tx) => {
      const [p] = await tx.insert(paroquias).values({ nome, slug, createdBy: user.id }).returning();
      await tx.insert(membrosParoquia).values({ paroquiaId: p.id, usuarioId: user.id, papel: "admin", createdBy: user.id });
      await tx.insert(comunidades).values({ paroquiaId: p.id, nome: comunidade, createdBy: user.id });
      await tx.insert(agendas).values({ paroquiaId: p.id, nome: "Pública", visibilidade: "publica", createdBy: user.id });
    });
  } catch (e) {
    const code = (e as { code?: string; cause?: { code?: string } });
    if ((code.code ?? code.cause?.code) === "23505") return { erro: "Este endereço (slug) já está em uso" };
    throw e;
  }
  return { ok: true };
}
