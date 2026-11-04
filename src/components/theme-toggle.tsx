"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Alterna a classe `dark` e guarda a escolha. Os dois ícones ficam no HTML e o CSS mostra o certo, sem depender de estado. */
export function ThemeToggle({ className }: { className?: string }) {
  function alternar() {
    const escuro = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("tema", escuro ? "escuro" : "claro");
    } catch {}
  }

  return (
    <Button type="button" variant="ghost" size="icon" onClick={alternar} aria-label="Alternar modo escuro" className={className}>
      <MoonIcon className="dark:hidden" />
      <SunIcon className="hidden dark:block" />
    </Button>
  );
}
