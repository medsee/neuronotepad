// NeurоNotepad Service Worker v1.0
const CACHE_NAME = 'neuronotepad-v1';
const FONT_CACHE = 'neuronotepad-fonts-v1';

// Asosiy fayllar — har doim keshlanadi
const CORE_FILES = [
  './index.html',
  './manifest.json'
];

// Google Fonts URL patternlari
const FONT_ORIGINS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

// ── INSTALL: asosiy fayllarni keshla ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_FILES))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: eski keshlarni tozala ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== FONT_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: offline strategiya ──
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Google Fonts — network first, keyin kesh (stale-while-revalidate)
  if (FONT_ORIGINS.some(o => url.hostname.includes(o))) {
    e.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        fetch(e.request)
          .then(res => {
            cache.put(e.request, res.clone());
            return res;
          })
          .catch(() => cache.match(e.request))
      )
    );
    return;
  }

  // Asosiy HTML va lokal fayllar — cache first, network fallback
  if (e.request.destination === 'document' || url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const networkFetch = fetch(e.request).then(res => {
          // Yangi versiyani keshga yoz
          if (res.ok) {
            caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone()));
          }
          return res;
        }).catch(() => null);

        return cached || networkFetch;
      })
    );
    return;
  }

  // Boshqa barcha so'rovlar — oddiy fetch
  e.respondWith(fetch(e.request).catch(() => new Response('Offline', {status: 503})));
});

// ── MESSAGE: keshni tozalash buyrug'i ──
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
  if (e.data === 'clearCache') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
  }
});
