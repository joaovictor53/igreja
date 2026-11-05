"use client";

import { useCallback, useMemo } from "react";
import { useLocalStorage } from "@/lib/use-local-storage";

type PrefsMap = Record<string, { hideDone?: boolean }>;

function ler(bruto: string | null): PrefsMap {
  if (!bruto) return {};
  try {
    const p = JSON.parse(bruto) as PrefsMap;
    return p && typeof p === "object" ? p : {};
  } catch {
    return {};
  }
}

/** Preferência por usuário e navegador: quais colunas escondem as tarefas concluídas. */
export function useKanbanColumnPrefs(userId: string) {
  const [bruto, gravar] = useLocalStorage(`tarefas-kanban-prefs:${userId}`);
  const prefs = useMemo(() => ler(bruto), [bruto]);

  const isHideDone = useCallback((coluna: string) => Boolean(prefs[coluna]?.hideDone), [prefs]);
  const toggleHideDone = useCallback(
    (coluna: string) => gravar(JSON.stringify({ ...prefs, [coluna]: { hideDone: !prefs[coluna]?.hideDone } })),
    [prefs, gravar],
  );

  return { isHideDone, toggleHideDone };
}
