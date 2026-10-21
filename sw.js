const CACHE_NAME = 'barrabus-tcc-circular-v1';

const PRE_CACHE_URLS = [
  './index.html',
  './pontos.html',
  './css/shared.css',
  './index.css',
  './pontos.css',
  './script.js',
  './js/utils.js',
  './js/theme.js',
  './js/favorites.js',
  './js/reminders.js',
  './js/horarios.js',
  './js/circular-ui.js',
  './js/modal.js',
  './js/circular-route.js',
  './js/appShell.js',
  './js/bootstrap-home.js',
  './js/bootstrap-points.js',
  './js/pontos.js',
  './dados/pontos.json',
  './dados/horarios.json',
  './manifest.json',
  './img/icon-192.png',
  './img/icon-512.png',
  './img/apple-touch-icon.png',
  './img/realista-point.png',
  './img/realista-point.modoclaro.png',
  './img/do-utilizador.png',
  './vendor/leaflet/leaflet.css',
  './vendor/leaflet/leaflet.js',
  './vendor/tabler/tabler-icons.min.css',
  './vendor/leaflet/images/layers-2x.png',
  './vendor/leaflet/images/layers.png',
  './vendor/leaflet/images/marker-icon-2x.png',
  './vendor/leaflet/images/marker-icon.png',
  './vendor/leaflet/images/marker-shadow.png',
  './vendor/tabler/fonts/tabler-icons.ttf',
  './vendor/tabler/fonts/tabler-icons.woff',
  './vendor/tabler/fonts/tabler-icons.woff2'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRE_CACHE_URLS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('barrabus-') && key !== CACHE_NAME).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  // External map tiles remain managed by the provider/browser HTTP cache.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, {ignoreSearch: true});
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response.ok || !cached ? response : cached;
    } catch (error) {
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const index = await cache.match(new URL('./index.html', self.registration.scope).href);
        if (index) return index;
      }
      return Response.error();
    }
  })());
});
