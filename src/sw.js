// Custom service worker — extends the auto-generated Workbox precaching with
// real push notification support, which vite-plugin-pwa's default
// `generateSW` strategy doesn't expose a hook for. This file is the *source*;
// vite-plugin-pwa (injectManifest mode) injects the precache manifest at
// `self.__WB_MANIFEST` and bundles this into the final dist/sw.js.

import { precacheAndRoute } from "workbox-precaching";

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// ── Push notifications ──────────────────────────────────────────────────────
// Backend sends: { title, body, url } as the push payload (see push_send.py).
self.addEventListener("push", (event) => {
  let data = { title: "YobbyForex", body: "You have a new update.", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-96.png",
      data: { url: data.url || "/" },
      vibrate: [100, 50, 100],
    })
  );
});

// Tapping the notification focuses an existing tab if one's open, otherwise
// opens a new one at the relevant in-app page (e.g. /copy for a trade alert).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
