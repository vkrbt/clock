const CACHE_NAME = 'nyc-clock-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/clock.png',
  '/hour.png',
  '/minute.png',
  '/second.png',
  '/clock.mp3'
];

// Установка Service Worker и кеширование файлов
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Активация и очистка старых кешей
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Перехват запросов и отдача из кеша
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Возвращаем из кеша или делаем сетевой запрос
        return response || fetch(event.request);
      })
  );
});


