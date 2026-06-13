const VERSION = 'fc-v1';
const SHELL = ['/', '/browse/', '/study/', '/bookmarked/', '/hidden/'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isDeckData(url) { return url.pathname.startsWith('/decks/'); }

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Never cache the API.
  if (url.pathname.startsWith('/api/') || url.pathname === '/_verify') return;

  // Navigations: network-first, fall back to cached shell; never cache a login redirect as shell.
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (res.redirected || url.pathname.endsWith('login.html')) return res;
          if (!res.ok) return res;
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    );
    return;
  }

  // Deck CSV/JSON: network-first (fresh), fall back to cache offline.
  if (isDeckData(url)) {
    e.respondWith(
      fetch(request).then((res) => { if (!res.ok) return res; const c = res.clone(); caches.open(VERSION).then((x) => x.put(request, c)).catch(() => {}); return res; })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Hashed static assets: cache-first.
  e.respondWith(caches.match(request).then((r) => r || fetch(request).then((res) => {
    if (!res.ok) return res;
    const c = res.clone(); caches.open(VERSION).then((x) => x.put(request, c)).catch(() => {}); return res;
  })));
});
