const VERSION = 'fc-v1'; // stamped to fc-<gitsha> by scripts/version-sw.mjs at postbuild
const SHELL = ['/', '/browse/', '/study/', '/bookmarked/', '/hidden/'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Serve cache immediately; refresh in the background. Falls back to cache on network failure.
function staleWhileRevalidate(request) {
  return caches.open(VERSION).then((cache) =>
    cache.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => { if (res && res.ok && !res.redirected) cache.put(request, res.clone()); return res; })
        .catch(() => cached);
      return cached || network;
    })
  );
}

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // let the browser handle cross-origin

  // Never cache the sync API, the auth subrequest, or the login page.
  if (url.pathname.startsWith('/api/') || url.pathname === '/_verify' || url.pathname.endsWith('login.html')) return;

  // Navigations: cache-first by route path, revalidate in background; never cache a login redirect.
  if (request.mode === 'navigate') {
    e.respondWith(
      caches.open(VERSION).then((cache) =>
        cache.match(url.pathname).then((cached) => {
          const network = fetch(request)
            .then((res) => {
              if (res && res.ok && !res.redirected && !res.url.endsWith('login.html')) cache.put(url.pathname, res.clone());
              return res;
            })
            .catch(() => cached || cache.match('/'));
          return cached || network;
        })
      )
    );
    return;
  }

  // Deck data and hashed static assets: stale-while-revalidate.
  if (url.pathname.startsWith('/decks/') || url.pathname.startsWith('/_next/static/')) {
    e.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Everything else: cache if present, else network.
  e.respondWith(caches.match(request).then((r) => r || fetch(request)));
});
