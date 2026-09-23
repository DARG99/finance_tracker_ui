const CACHE = "finance-tracker-offline-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add("/offline.html")));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith("finance-tracker-offline-") && key !== CACHE)
      .map((key) => caches.delete(key)),
  )).then(() => self.clients.claim()));
});

// Only provide an offline navigation fallback. Never cache API responses,
// tokens, financial data, or app bundles that could become stale on deployment.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.mode !== "navigate" || url.origin !== self.location.origin
      || url.pathname === "/api" || url.pathname.startsWith("/api/")) return;
  event.respondWith(fetch(event.request).catch(async () =>
    (await caches.match("/offline.html")) || Response.error(),
  ));
});
