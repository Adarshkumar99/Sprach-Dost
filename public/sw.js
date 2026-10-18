/* SprachDost service worker — Web Push for the daily Word of the Day.
   Registered by src/lib/push.ts. No aggressive caching (the app is dynamic). */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "SprachDost", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "🌟 Word of the Day";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "Dein tägliches deutsches Wort wartet!",
      icon: data.icon || "/icon-192.png",
      badge: data.badge || "/icon-192.png",
      tag: data.tag || "sprachdost-wotd",
      data: { url: data.url || "/practice" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/practice";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
