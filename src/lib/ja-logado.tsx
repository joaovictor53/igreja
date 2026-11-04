import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";

/** Telas de login/cadastro: quem já tem sessão válida vai direto para o painel. */
export async function RedirecionaSeLogado() {
  if (await getSession()) redirect("/painel");
  return null;
}
