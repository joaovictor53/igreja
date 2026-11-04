import { redirect } from "next/navigation";

// A página inicial é o login. Quem já tem sessão segue de /login para o painel.
export default function Home() {
  redirect("/login");
}
