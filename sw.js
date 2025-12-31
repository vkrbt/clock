// Версия кэша - обновляется при каждом деплое
const CACHE_VERSION = 'v2';
const CACHE_NAME = `nyc-clock-${CACHE_VERSION}`;
const urlsToCache = [
  '/',
  '/index.html',
  '/clock.png',
  '/clock.webp',
  '/hour.png',
  '/hour.webp',
  '/minute.png',
  '/minute.webp',
  '/second.png',
  '/second.webp',
  '/clock.mp3',
  '/manifest.json'
];

// Установка Service Worker и кеширование файлов
self.addEventListener('install', event => {
  console.log('[SW] Установка новой версии:', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Кеширование файлов');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] Пропуск ожидания, активация немедленно');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] Ошибка при установке:', err);
      })
  );
});

// Активация и очистка старых кешей
self.addEventListener('activate', event => {
  console.log('[SW] Активация новой версии:', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name.startsWith('nyc-clock-'))
          .map(name => {
            console.log('[SW] Удаление старого кеша:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Захват всех клиентов');
      return self.clients.claim();
    }).then(() => {
      // Уведомляем все открытые вкладки о новой версии
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_UPDATED',
            version: CACHE_VERSION
          });
        });
      });
    })
  );
});

// Перехват запросов с проверкой обновлений
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Пропускаем не-GET запросы
  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return fetch(request)
        .then(networkResponse => {
          // Если сетевой запрос успешен, обновляем кеш
          if (networkResponse && networkResponse.status === 200) {
            // Проверяем, изменился ли файл
            cache.match(request).then(cachedResponse => {
              if (cachedResponse) {
                const cachedETag = cachedResponse.headers.get('etag');
                const networkETag = networkResponse.headers.get('etag');
                
                // Если ETag изменился, файл обновился
                if (cachedETag && networkETag && cachedETag !== networkETag) {
                  console.log('[SW] Обнаружено обновление файла:', request.url);
                  // Уведомляем клиентов об обновлении
                  self.clients.matchAll().then(clients => {
                    clients.forEach(client => {
                      client.postMessage({
                        type: 'CONTENT_UPDATED',
                        url: request.url
                      });
                    });
                  });
                }
              }
              
              // Обновляем кеш
              cache.put(request, networkResponse.clone());
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Если сеть недоступна, используем кеш
          return cache.match(request);
        });
    })
  );
});

// Обработка сообщений от клиентов
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});


