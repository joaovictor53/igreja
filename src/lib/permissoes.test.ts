import { test } from "node:test";
import assert from "node:assert/strict";
import { permissoesPadrao, permissoesValidas, TODAS_PERMISSOES, PAPEIS } from "./permissoes";

test("administrador tem todas as permissões; membro e coordenador, nenhuma", () => {
  assert.deepEqual(permissoesPadrao("admin"), TODAS_PERMISSOES);
  assert.deepEqual(permissoesPadrao("membro"), []);
  assert.deepEqual(permissoesPadrao("coordenador"), []);
  assert.deepEqual(permissoesPadrao("c_inexistente"), []);
});

test("padrões: catequista só vê catequese; só admin gerencia papéis", () => {
  assert.deepEqual(permissoesPadrao("catequista"), ["catequese:ver"]);
  assert.ok(permissoesPadrao("paroco").includes("auditoria:ver"));
  assert.ok(!permissoesPadrao("secretaria").includes("auditoria:ver"));
  for (const p of PAPEIS) assert.equal(permissoesPadrao(p).includes("papeis:gerir"), p === "admin");
});

test("permissoesValidas ignora lixo e nunca deixa atribuir papeis:gerir", () => {
  assert.deepEqual(permissoesValidas(["pessoas:gerir", "x:y", "papeis:gerir", 3]), ["pessoas:gerir"]);
  assert.deepEqual(permissoesValidas("pessoas:gerir"), []);
});

test("quem gerencia tarefas também as vê", async () => {
  const { comImplicitas } = await import("./permissoes");
  assert.ok(comImplicitas(["tarefas:gerir"]).has("tarefas:ver"));
  assert.ok(!comImplicitas(["pessoas:gerir"]).has("tarefas:ver"));
});
