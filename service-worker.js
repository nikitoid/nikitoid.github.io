// service-worker.js

// Версия кеша. Меняйте это значение при каждом обновлении файлов приложения.
const CACHE_VERSION = "0.0.1";
const CACHE_NAME = `heic-to-jpeg-${CACHE_VERSION}`;

// Файлы, которые необходимо кешировать для работы офлайн.
const urlsToCache = [
  "/",
  "/index.html",
  "/style.css",
  "/manifest.json",
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
        // Принудительно активируем новый Service Worker сразу после установки,
        // не дожидаясь закрытия всех вкладок. Это важно для системы обновлений.
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

// 3. Перехват сетевых запросов (Fetch)
self.addEventListener("fetch", (event) => {
  event.respondWith(
    // Стратегия "Cache first": сначала ищем ответ в кеше
    caches.match(event.request).then((response) => {
      if (response) {
        // Если ресурс найден в кеше, возвращаем его
        return response;
      }
      // Если в кеше нет, делаем запрос к сети
      return fetch(event.request);
    })
  );
});

// 4. Получение сообщения от клиента для активации обновления
self.addEventListener("message", (event) => {
  if (event.data && event.data.action === "skipWaiting") {
    console.log(
      "Service Worker: Получена команда skipWaiting, активация нового воркера..."
    );
    self.skipWaiting();
  }
});
