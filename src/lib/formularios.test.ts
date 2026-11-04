import test from "node:test";
import assert from "node:assert/strict";
import { MODELOS, celulaCsv, idDoCampo, prefixoCampo, validarResposta } from "./formularios";

const form = (o: Record<string, string | string[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) for (const x of [v].flat()) f.append(prefixoCampo + k, x);
  return f;
};
const catequese = MODELOS.catequese.campos;
const ok = { nome: "Ana", nascimento: "2015-03-02", responsavel: "Maria", telefone: "(92) 99999-1234", etapa: "Eucaristia", aceite: "on" };

test("aceita resposta válida", () => {
  const r = validarResposta(catequese, form(ok));
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.dados.aceite, true);
});

test("exige campo obrigatório e o aceite LGPD", () => {
  assert.deepEqual(validarResposta(catequese, form({ ...ok, nome: " " })), { ok: false, erro: "Preencha: Nome do catequizando" });
  const semAceite: Record<string, string> = { ...ok };
  delete semAceite.aceite;
  assert.equal(validarResposta(catequese, form(semAceite)).ok, false);
});

test("rejeita opção fora da lista, data e telefone inválidos", () => {
  assert.equal(validarResposta(catequese, form({ ...ok, etapa: "Outra" })).ok, false);
  assert.equal(validarResposta(catequese, form({ ...ok, nascimento: "31/02/2015" })).ok, false);
  assert.equal(validarResposta(catequese, form({ ...ok, telefone: "123" })).ok, false);
});

test("ignora campos que não existem no formulário", () => {
  const r = validarResposta(catequese, form({ ...ok, injetado: "x" }));
  assert.equal(r.ok && "injetado" in r.dados, false);
});

test("escolha múltipla valida cada opção", () => {
  const campos = MODELOS.voluntariado.campos;
  const base = { nome: "Jo", telefone: "92999991234", aceite: "on" };
  assert.equal(validarResposta(campos, form({ ...base, areas: ["Liturgia", "Música"] })).ok, true);
  assert.equal(validarResposta(campos, form({ ...base, areas: ["Liturgia", "Hacker"] })).ok, false);
});

test("id do campo é estável e não colide", () => {
  assert.equal(idDoCampo("Data de Nascimento", []), "data_de_nascimento");
  assert.equal(idDoCampo("Nome", ["nome"]), "nome_2");
});

test("CSV neutraliza fórmulas e escapa aspas", () => {
  assert.equal(celulaCsv("=HYPERLINK(1)"), `"'=HYPERLINK(1)"`);
  assert.equal(celulaCsv('diz "oi"'), `"diz ""oi"""`);
  assert.equal(celulaCsv(["a", "b"]), `"a; b"`);
});
