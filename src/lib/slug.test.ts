import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify, slugLivre } from "./slug";

test("slugify tira acentos e pontuação", () => {
  assert.equal(slugify("Capela São José — Ramal 3"), "capela-sao-jose-ramal-3");
  assert.equal(slugify("  Matriz  "), "matriz");
  assert.equal(slugify("???"), "");
});

test("slugLivre acrescenta sufixo quando já existe", () => {
  assert.equal(slugLivre("matriz", []), "matriz");
  assert.equal(slugLivre("matriz", ["matriz"]), "matriz-2");
  assert.equal(slugLivre("matriz", ["matriz", "matriz-2"]), "matriz-3");
  assert.equal(slugLivre("", []), "comunidade");
});
