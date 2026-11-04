import test from "node:test";
import assert from "node:assert/strict";
import { gerarEscala } from "./escala";

const cel = (id: string, iso: string) => ({ id, inicio: new Date(iso) });
const semanas = ["2026-11-01", "2026-11-08", "2026-11-15", "2026-11-22"].map((d, i) =>
  cel(`c${i}`, `${d}T11:00:00Z`),
);

test("distribui de forma equilibrada", () => {
  const itens = gerarEscala(semanas, [{ id: "leitor", vagas: 1, membros: ["a", "b"] }]);
  const por = (p: string) => itens.filter((i) => i.pessoaId === p).length;
  assert.equal(por("a"), 2);
  assert.equal(por("b"), 2);
});

test("é reprodutível com a mesma seed", () => {
  const f = [{ id: "leitor", vagas: 1, membros: ["a", "b", "c"] }];
  assert.deepEqual(gerarEscala(semanas, f, { seed: 7 }), gerarEscala(semanas, f, { seed: 7 }));
});

test("não repete pessoa na mesma celebração nem no mesmo dia", () => {
  const dois = [cel("m", "2026-11-01T11:00:00Z"), cel("t", "2026-11-01T22:00:00Z")];
  const itens = gerarEscala(dois, [
    { id: "leitor", vagas: 1, membros: ["a", "b"] },
    { id: "salmista", vagas: 1, membros: ["a", "b"] },
  ]);
  const a = itens.filter((i) => i.pessoaId === "a").map((i) => i.celebracaoId);
  assert.equal(new Set(a).size, a.length);
  // mesmo dia: cada pessoa aparece no máximo uma vez no dia todo, então sobram vagas vazias
  assert.equal(itens.filter((i) => i.pessoaId).length, 2);
});

test("respeita o máximo por mês e deixa vagas vazias", () => {
  const itens = gerarEscala(semanas, [{ id: "leitor", vagas: 1, membros: ["a"] }], { maxPorMes: 2 });
  assert.equal(itens.filter((i) => i.pessoaId === "a").length, 2);
  assert.equal(itens.filter((i) => i.pessoaId === null).length, 2);
});
