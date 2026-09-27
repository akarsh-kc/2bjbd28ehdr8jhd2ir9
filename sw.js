// Reasoning PYQ Picker — service worker
// Caches the app shell + external CDN assets (Tailwind, Google Fonts, Font Awesome)
// the first time they load successfully, then serves the cached copy on every
// later load. This is the same mechanism a PWABuilder-wrapped app gets for free.

const CACHE_NAME = 'reasoning-pyq-picker-v1';

// Same-origin files to save immediately when the service worker installs.
const APP_SHELL = [
  './',
  './index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Stale-while-revalidate: serve the cached copy instantly if we have one
// (so a flaky/blocked CDN never breaks the page), and quietly refresh the
// cache in the background whenever the network call succeeds.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached); // offline / CDN down → fall back to cache

        // Cached copy first (instant + reliable). If nothing cached yet,
        // wait on the network once.
        return cached || network;
      })
    )
  );
});
