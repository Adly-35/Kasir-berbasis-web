const CACHE_NAME = 'kasirpro-v2';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './db.js',
  './utils.js',
  './stok.js',
  './request.js',
  './approval.js',
  './rekap.js',
  './karyawan.js',
  './setting.js',
  './beep.js',
  './patroli.js',
  './auth.js',
  './script.js',
  './kasir.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(err => console.log('Cache failed:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request).catch(() => {
          // Fallback for offline
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
