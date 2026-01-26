// sw.js
const CACHE_NAME = "rg-scan-v1";

// Tout ce qui est nécessaire pour que l'app s'ouvre + scanne OFFLINE
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./vendor/html5-qrcode.min.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

// Cache-first pour les fichiers du site (même origine)
// -> garantit ouverture offline fiable
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET") return;

  // Même origine (GitHub Pages) : cache-first + mise en cache au fil de l’eau
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;

        return fetch(req)
          .then((resp) => {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
            return resp;
          })
          .catch(() => caches.match("./index.html"));
      })
    );
    return;
  }

  // Autres origines (ex: GAS JSONP) : on ne met pas en cache,
  // on laisse le navigateur gérer (offline => erreur, et ton code retry plus tard).
});
