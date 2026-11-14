// Service worker: guarda la app y todas las tablas para usarla sin conexión.
//
// - Página (index.html): primero la red (con límite de tiempo) y si no, la guardada. Así una
//   versión nueva nunca arranca con el HTML viejo apuntando a JS que ya no existe.
// - assets/ (nombres con hash, inmutables): siempre de la caché; si falta, de la red.
// - Resto (tablas, fotos, íconos): la guardada al instante y se actualiza en segundo plano.
const CACHE = 'mm-v7';
const NAV_TIMEOUT_MS = 4000;

const PHOTOS = [
  'atardecer', 'bigua', 'flamencos', 'espartillar', 'kayaks-playa', 'banco-gaviotas', 'flamencos-proa',
  'muelle-viejo', 'proa-aves', 'maldo-calma', 'gaviotas-vuelo', 'kayak-y-barco',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // index.html fresco y los JS/CSS que referencia: la app queda completa sin conexión
      // desde la primera visita.
      const index = await fetch('./', { cache: 'reload' });
      const html = await index.clone().text();
      await cache.put('./', index);
      const assets = [...html.matchAll(/(?:src|href)="\/?(assets\/[^"]+)"/g)].map((m) => m[1]);
      await cache.addAll([
        ...assets,
        'manifest.webmanifest',
        'icon.svg',
        'apple-touch-icon.png',
        'icon-192.png',
        'icon-512.png',
        ...PHOTOS.map((p) => `photos/${p}.webp`),
      ]);
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

/** fetch que se rinde a los `ms` (señal muy mala): rechaza para usar la caché. */
function fetchWithTimeout(req, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(req, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const res = await fetchWithTimeout(req, NAV_TIMEOUT_MS);
          if (res.ok) cache.put('./', res.clone());
          return res;
        } catch {
          return (await cache.match('./')) ?? Response.error();
        }
      })(),
    );
    return;
  }

  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })(),
    );
    return;
  }

  // Stale-while-revalidate.
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
      return (await network) ?? Response.error();
    })(),
  );
});
