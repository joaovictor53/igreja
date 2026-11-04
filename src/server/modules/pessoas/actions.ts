"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { pessoas } from "@/db/schema";
import { auditar } from "@/server/audit";
import { requireParoquia } from "@/server/auth/session";

export async function criarPessoa(formData: FormData) {
  const { paroquia, user } = await requireParoquia(["admin", "paroco", "secretaria"]);
  const nome = z.string().trim().min(2).parse(formData.get("nome"));
  const nomeBusca = nome.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  await db.transaction(async (tx) => {
    const [p] = await tx
      .insert(pessoas)
      .values({ paroquiaId: paroquia.id, nome, nomeBusca, createdBy: user.id })
      .returning({ id: pessoas.id });
    await auditar(tx, { paroquiaId: paroquia.id, usuarioId: user.id, tabela: "pessoas", registroId: p.id, acao: "criar", depois: { nome } });
  });
  revalidatePath("/painel/pessoas");
  revalidatePath("/painel/escalas", "layout");
}
