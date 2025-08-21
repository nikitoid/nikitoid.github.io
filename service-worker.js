// service-worker.js

// Версия кеша. Меняйте это значение при каждом обновлении файлов приложения.
const CACHE_VERSION = "0.0.7";
const CACHE_NAME = `heic-to-jpeg-${CACHE_VERSION}`;

// Файлы, которые необходимо кешировать для работы офлайн.
const urlsToCache = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/manifest.json",
  "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// 1. Установка Service Worker
self.addEventListener("install", (event) => {
  console.log("Service Worker: Установка...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Service Worker: Кеширование основных файлов");
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Принудительно активируем новый Service Worker сразу после установки.
        return self.skipWaiting();
      })
  );
});

// 2. Активация Service Worker
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Активация...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Удаляем старые версии кеша, если они есть
            if (cacheName !== CACHE_NAME) {
              console.log("Service Worker: Удаление старого кеша:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Позволяем активному Service Worker'у начать перехватывать запросы сразу
        return self.clients.claim();
      })
  );
});

// 3. Перехват сетевых запросов (Fetch) - Стратегия "Network First"
self.addEventListener("fetch", (event) => {
  // Игнорируем запросы, которые не являются GET
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Если запрос успешен, кешируем свежую версию и возвращаем ее
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      })
      .catch(() => {
        // Если сети нет, пытаемся достать ответ из кеша
        return caches.match(event.request);
      })
  );
});
