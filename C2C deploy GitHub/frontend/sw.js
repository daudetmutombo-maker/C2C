const CACHE_NAME = 'c2s-cache-v2';
const urlsToCache = [
  './',
  './index.html',
  './guide.html',
  './css/style.css',
  './js/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // Exclusion des appels API (on ne veut pas les cacher en dur ici)
  if (event.request.url.includes('/api/')) {
      return; 
  }
  
  // Stratégie "Network First" (Réseau d'abord, Cache en secours)
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Optionnel : Mettre à jour le cache dynamiquement
        // return caches.open(CACHE_NAME).then(cache => { ... })
        return response;
      })
      .catch(() => {
        // En cas d'échec du réseau, on cherche dans le cache
        return caches.match(event.request);
      })
  );
});
