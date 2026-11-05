import { test } from "node:test";
import assert from "node:assert/strict";
import { compararTarefas, progressoChecklist, rotuloAtividade } from "./tarefas";

test("progressoChecklist: vazio é 0 e arredonda", () => {
  assert.equal(progressoChecklist([]), 0);
  assert.equal(progressoChecklist([{ concluido: true }, { concluido: false }, { concluido: false }]), 33);
  assert.equal(progressoChecklist([{ concluido: true }]), 100);
});

test("compararTarefas: prioridade, depois prazo, sem prazo por último", () => {
  const lista = [
    { id: "a", prioridade: "BAIXA", prazo: "2026-01-01" },
    { id: "b", prioridade: "URGENTE", prazo: null },
    { id: "c", prioridade: "MEDIA", prazo: null },
    { id: "d", prioridade: "MEDIA", prazo: "2026-02-01" },
  ] as const;
  const ordem = [...lista].sort(compararTarefas).map((t) => t.id);
  assert.deepEqual(ordem, ["b", "d", "c", "a"]);
});

test("rotuloAtividade traduz a mudança de status", () => {
  assert.equal(rotuloAtividade("STATUS_ATUALIZADO", { de: "TODO", para: "DONE" }), "Status: A fazer → Concluída");
  assert.equal(rotuloAtividade("TIPO_NOVO", null), "TIPO_NOVO");
});
