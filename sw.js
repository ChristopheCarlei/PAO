/* Service worker : coquille applicative en cache, images mises en cache à l'usage.
   L'application reste utilisable hors ligne une fois les cartes vues. */
const VERSION = 'pao-v1';
const SHELL = 'shell-' + VERSION;
const MEDIA = 'media-' + VERSION;

const SHELL_FILES = [
  './',
  './index.html',
  './css/app.css',
  './js/data.js',
  './js/store.js',
  './js/card.js',
  './js/app.js',
  './manifest.webmanifest',
  './assets/icon.webp'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== SHELL && k !== MEDIA).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;   // polices Google : réseau direct

  // Images : cache d'abord, puis réseau (elles ne changent jamais).
  if (url.pathname.endsWith('.webp')) {
    event.respondWith(
      caches.open(MEDIA).then((cache) =>
        cache.match(request).then((hit) => hit || fetch(request).then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        }))
      )
    );
    return;
  }

  // Coquille : réseau d'abord pour rester à jour, cache en secours.
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(SHELL).then((cache) => cache.put(request, copy));
        }
        return res;
      })
      .catch(() => caches.match(request).then((hit) => hit || caches.match('./index.html')))
  );
});
