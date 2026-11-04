import { test } from "node:test";
import assert from "node:assert/strict";
import { haConflito, tarefaAtrasada, linhasParaChecklist, versiculoDoDia } from "./secretaria";

const h = (s: string) => new Date(`2026-11-03T${s}:00Z`);

test("conflito: sobreposição parcial, contenção e adjacência", () => {
  assert.equal(haConflito({ inicio: h("10:00"), fim: h("12:00") }, { inicio: h("11:00"), fim: h("13:00") }), true);
  assert.equal(haConflito({ inicio: h("10:00"), fim: h("14:00") }, { inicio: h("11:00"), fim: h("12:00") }), true);
  assert.equal(haConflito({ inicio: h("10:00"), fim: h("12:00") }, { inicio: h("12:00"), fim: h("13:00") }), false);
});

test("tarefa atrasada só se aberta e com prazo vencido", () => {
  assert.equal(tarefaAtrasada("2026-11-02", false, "2026-11-03"), true);
  assert.equal(tarefaAtrasada("2026-11-03", false, "2026-11-03"), false);
  assert.equal(tarefaAtrasada("2026-11-02", true, "2026-11-03"), false);
  assert.equal(tarefaAtrasada(null, false, "2026-11-03"), false);
});

test("checklist ignora linhas vazias", () => {
  assert.deepEqual(linhasParaChecklist("a\n\n  b  \n"), [
    { texto: "a", feito: false },
    { texto: "b", feito: false },
  ]);
});

test("versículo é estável no mesmo dia", () => {
  assert.deepEqual(versiculoDoDia("2026-11-03"), versiculoDoDia("2026-11-03"));
});
