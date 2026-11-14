// Service worker: guarda la app y todas las tablas para usarla sin conexión.
const CACHE = 'mm-v3';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(['./', 'manifest.webmanifest', 'icon.svg', 'photos/atardecer.webp', 'photos/flamencos.webp', 'photos/bigua.webp', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png']);
      // Precarga de todas las tablas de marea listadas por build-data.
      try {
        const files = await (await fetch('data/files.json', { cache: 'no-cache' })).json();
        await cache.addAll(files);
      } catch {}
      self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

// Stale-while-revalidate para todo lo del mismo origen.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);
      if (cached) {
        event.waitUntil(network);
        return cached;
      }
      return (await network) ?? (req.mode === 'navigate' ? cache.match('./') : Response.error());
    })(),
  );
});
