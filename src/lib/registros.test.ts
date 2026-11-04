import test from "node:test";
import assert from "node:assert/strict";
import { codigoValido, gerarCodigo, hashCertidao, nomePrincipal, normalizar, textoCertidao, type DadosCertidao } from "./registros";

const batismo: DadosCertidao = {
  tipo: "batismo",
  livro: 12,
  folha: "34",
  termo: "560",
  data: "2020-05-17",
  celebrante: "Pe. João",
  paroquia: "Paróquia Teste",
  pessoas: [
    { papel: "principal", nome: "Ana Souza" },
    { papel: "pai", nome: "José Souza" },
    { papel: "mae", nome: "Maria Souza" },
    { papel: "padrinho", nome: "Carlos Lima" },
    { papel: "madrinha", nome: "Rita Lima" },
  ],
  averbacoes: [],
};

test("texto do batismo traz localização, filiação, data e padrinhos", () => {
  const [p1, p2] = textoCertidao(batismo);
  assert.match(p1, /Livro 12, folha 34, termo 560/);
  assert.match(p1, /Ana Souza, filho\(a\) de José Souza e Maria Souza/);
  assert.match(p1, /Maria Souza, foi batizado\(a\) em 17 de maio de 2020/);
  assert.match(p1, /celebrante Pe\. João/);
  assert.equal(p2, "Padrinhos: Carlos Lima e Rita Lima.");
});

test("averbações entram no texto", () => {
  const t = textoCertidao({ ...batismo, averbacoes: [{ data: "2030-01-02", texto: "Casou-se com Pedro." }] });
  assert.match(t.at(-1)!, /^Averbação em 2 de janeiro de 2030: Casou-se com Pedro\.$/);
});

test("casamento identifica os dois cônjuges", () => {
  const casamento: DadosCertidao = {
    ...batismo,
    tipo: "casamento",
    pessoas: [{ papel: "principal", nome: "Pedro" }, { papel: "conjuge", nome: "Lia" }],
  };
  assert.equal(nomePrincipal(casamento.pessoas, "casamento"), "Pedro e Lia");
  assert.match(textoCertidao(casamento)[0], /Pedro e Lia contraíram matrimônio/);
});

test("códigos são únicos, bem formados e sem caracteres ambíguos", () => {
  const codigos = new Set(Array.from({ length: 500 }, gerarCodigo));
  assert.equal(codigos.size, 500);
  for (const c of codigos) assert.ok(codigoValido(c), c);
  assert.equal(codigoValido("ABCD-EFGH-IJKL"), false); // contém I e L
  assert.equal(codigoValido("../etc"), false);
});

test("hash muda se o conteúdo, o código ou a data mudam", () => {
  const t = textoCertidao(batismo);
  const d = new Date("2026-10-26T12:00:00Z");
  const base = hashCertidao(t, "AAAA-BBBB-CCCC", d);
  assert.equal(base, hashCertidao(t, "AAAA-BBBB-CCCC", d));
  assert.notEqual(base, hashCertidao([...t, "extra"], "AAAA-BBBB-CCCC", d));
  assert.notEqual(base, hashCertidao(t, "AAAA-BBBB-CCCD", d));
  assert.notEqual(base, hashCertidao(t, "AAAA-BBBB-CCCC", new Date("2026-10-27T12:00:00Z")));
});

test("normaliza acentos para a busca", () => {
  assert.equal(normalizar("  JOSÉ da Conceição "), "jose da conceicao");
});
