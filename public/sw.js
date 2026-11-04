// Service worker: só recebe Web Push e abre a tela certa ao clicar na notificação.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch {
    dados = { corpo: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(dados.titulo || "Sistema Paroquial", {
      body: dados.corpo || "",
      data: { url: dados.url || "/painel" },
      icon: "/favicon.ico",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const alvo = new URL((event.notification.data && event.notification.data.url) || "/painel", self.location.origin);
  if (alvo.origin !== self.location.origin) return;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      for (const j of janelas) {
        if (new URL(j.url).origin === alvo.origin && "focus" in j) return j.navigate(alvo.href).then((c) => c && c.focus());
      }
      return self.clients.openWindow(alvo.href);
    }),
  );
});
