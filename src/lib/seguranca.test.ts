import { test } from "node:test";
import assert from "node:assert/strict";
import { endpointPushPermitido } from "./push";
import { ipDoCliente } from "./ip";

test("push: aceita só serviços conhecidos, em https", () => {
  assert.equal(endpointPushPermitido("https://fcm.googleapis.com/fcm/send/abc"), true);
  assert.equal(endpointPushPermitido("https://updates.push.services.mozilla.com/wpush/v2/abc"), true);
  assert.equal(endpointPushPermitido("https://wns2-par02p.notify.windows.com/w/?token=x"), true);
  assert.equal(endpointPushPermitido("https://web.push.apple.com/abc"), true);
});

test("push: recusa hosts internos, http, portas, credenciais e domínios parecidos", () => {
  for (const u of [
    "https://10.0.0.5/x",
    "https://localhost/x",
    "http://fcm.googleapis.com/x",
    "https://fcm.googleapis.com:8443/x",
    "https://user:pw@fcm.googleapis.com/x",
    "https://fcm.googleapis.com.evil.com/x",
    "https://evilfcm.googleapis.com.example/x",
    "https://notfcm.googleapis.com/x".replace("notfcm", "x@"),
    "não é url",
  ]) assert.equal(endpointPushPermitido(u), false, u);
});

test("ip: ignora o que o cliente forja à esquerda", () => {
  assert.equal(ipDoCliente("1.2.3.4, 203.0.113.7"), "203.0.113.7");
  assert.equal(ipDoCliente("203.0.113.7"), "203.0.113.7");
  assert.equal(ipDoCliente("9.9.9.9, 1.2.3.4, 10.0.0.1", 2), "1.2.3.4");
  assert.equal(ipDoCliente(null), "local");
});
