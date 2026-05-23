const CACHE = 'mago-v1';
const SHELL = ['/', '/index.html', '/icon.svg', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Only cache same-origin requests; let API calls and CDN pass through
  if (!e.request.url.startsWith(self.location.origin)) return;
  if (e.request.url.includes('/api')) return;

  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
