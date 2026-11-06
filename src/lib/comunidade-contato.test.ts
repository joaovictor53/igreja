import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizarMapaUrl, normalizarWhatsapp, tipoDeImagem } from "./comunidade-contato";

test("whatsapp", () => {
  assert.equal(normalizarWhatsapp("(92) 99999-0000"), "5592999990000");
  assert.equal(normalizarWhatsapp("+55 92 99999-0000"), "5592999990000");
  assert.equal(normalizarWhatsapp("  "), "");
  assert.equal(normalizarWhatsapp("123"), null);
  assert.equal(normalizarWhatsapp("+1 415 555 2671"), null);
});

test("mapa aceita só https de serviços conhecidos", () => {
  assert.equal(normalizarMapaUrl(""), "");
  assert.ok(normalizarMapaUrl("https://maps.app.goo.gl/abc123"));
  assert.ok(normalizarMapaUrl("https://www.google.com/maps/place/Manaus"));
  assert.equal(normalizarMapaUrl("http://maps.app.goo.gl/abc"), null);
  assert.equal(normalizarMapaUrl("https://exemplo.com/maps"), null);
  assert.equal(normalizarMapaUrl("https://www.google.com/search?q=x"), null);
  assert.equal(normalizarMapaUrl("javascript:alert(1)"), null);
  assert.equal(normalizarMapaUrl("https://maps.app.goo.gl.evil.com/x"), null);
});

test("tipo de imagem pelos bytes", () => {
  const pad = (a: number[]) => new Uint8Array([...a, ...new Array(20).fill(0)]);
  assert.equal(tipoDeImagem(pad([0xff, 0xd8, 0xff])), "image/jpeg");
  assert.equal(tipoDeImagem(pad([0x89, 0x50, 0x4e, 0x47])), "image/png");
  assert.equal(tipoDeImagem(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ")), "image/webp");
  assert.equal(tipoDeImagem(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'></svg>")), null);
});
