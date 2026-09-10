/* HealthFury notification service worker */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "healthfury-notify") return;
  event.waitUntil(
    self.registration.showNotification(data.title || "HealthFury", {
      body: data.body || undefined,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      requireInteraction: Boolean(data.urgent),
      vibrate: data.urgent ? [200, 100, 200, 100, 200] : [120],
      data: { link: data.link || "/dashboard" },
    }),
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    payload = { title: "HealthFury", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || "HealthFury", {
      body: payload.body || undefined,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      requireInteraction: Boolean(payload.urgent),
      data: { link: payload.link || "/dashboard" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      return self.clients.openWindow(link);
    }),
  );
});
