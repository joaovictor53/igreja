"use client";

import { useCallback, useSyncExternalStore } from "react";

const ouvintes = new Set<() => void>();

/**
 * Lê e grava uma chave do localStorage. No servidor (e na hidratação) o valor é null,
 * então o HTML coincide; depois da montagem o valor real aparece. Tolera localStorage bloqueado.
 */
export function useLocalStorage(chave: string): [string | null, (valor: string) => void] {
  const assinar = useCallback((aviso: () => void) => {
    ouvintes.add(aviso);
    window.addEventListener("storage", aviso);
    return () => {
      ouvintes.delete(aviso);
      window.removeEventListener("storage", aviso);
    };
  }, []);
  const valor = useSyncExternalStore(
    assinar,
    () => {
      try {
        return localStorage.getItem(chave);
      } catch {
        return null;
      }
    },
    () => null,
  );
  const gravar = useCallback(
    (novo: string) => {
      try {
        localStorage.setItem(chave, novo);
      } catch {}
      ouvintes.forEach((o) => o());
    },
    [chave],
  );
  return [valor, gravar];
}
