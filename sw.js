const CACHE_NAME = 'rockStal-v13';
const ASSETS = [
  '/SteelCalc-Pro/',
  '/SteelCalc-Pro/index.html',
  '/SteelCalc-Pro/admin.html',
  '/SteelCalc-Pro/style.css',
  '/SteelCalc-Pro/admin.css',
  '/SteelCalc-Pro/script.js',
  '/SteelCalc-Pro/admin.js',
  '/SteelCalc-Pro/icon-192.png',
  '/SteelCalc-Pro/icon-512.png',
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

self.addEventListener('fetch', e => {
  if (e.request.url.includes('firebase') || e.request.url.includes('googleapis') || e.request.url.includes('gstatic')) {
    return;
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