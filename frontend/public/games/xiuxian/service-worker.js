// ============================================================
// Service Worker — enables offline play for PWA
// ============================================================

const CACHE_NAME = 'xiuxian-cache-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/data.js',
  './js/data-expansion.js',
  './js/data-encounters.js',
  './js/data-beasts.js',
  './js/audio.js',
  './js/tutorial.js',
  './js/bigint.js',
  './js/player.js',
  './js/cultivation.js',
  './js/techniques.js',
  './js/alchemy.js',
  './js/combat.js',
  './js/inventory.js',
  './js/exploration.js',
  './js/save.js',
  './js/sect.js',
  './js/world.js',
  './js/forge.js',
  './js/auction.js',
  './js/assets.js',
  './js/generated-resource-assets.js',
  './js/ui.js',
  './js/main.js',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).catch(() => {
      // If some assets fail, continue anyway
      return Promise.resolve();
    })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: cache-first strategy
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Return cached version and refresh in background
        fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, response);
            });
          }
        }).catch(() => {});
        return cached;
      }
      // Not in cache, fetch from network
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200) return response;
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      }).catch(() => {
        // Network failed, return offline fallback if available
        return new Response('离线模式：部分内容可能无法加载', {
          status: 503,
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
        });
      });
    })
  );
});
