// Rock-Stal PWA Service Worker
const CACHE_NAME = 'rockStal-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/admin.html',
  '/style.css',
  '/admin.css',
  '/script.js',
  '/admin.js',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network first — Firebase always fresh, fallback to cache
self.addEventListener('fetch', e => {
  if (e.request.url.includes('firebase') || e.request.url.includes('googleapis')) {
    return; // Firebase requests — always network
  }
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});