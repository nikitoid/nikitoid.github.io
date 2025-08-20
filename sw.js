// ИЗМЕНЕНО: Версия кэша для запуска обновления
const CACHE_NAME = "heic-converter-v0.0.7";
// Файлы, которые нужно закэшировать
const urlsToCache = [
  "/",
  "/index.html",
  "/script.js",
  "/style.css",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/favicon.ico",
  "https://cdn.tailwindcss.com",
  "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js",
];

// Установка Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Кэш открыт");
      return cache.addAll(urlsToCache);
    })
  );
});

// Активация Service Worker и удаление старых кэшей
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim()) // Захватываем контроль над клиентами
  );
});

// Перехват сетевых запросов
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Слушатель для команд от клиента
self.addEventListener("message", (event) => {
  // Команда для активации новой версии
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  // Команда для получения текущей версии
  if (event.data && event.data.type === "GET_VERSION") {
    const version = CACHE_NAME.split("-").pop() || "N/A";
    if (event.source) {
      event.source.postMessage({ type: "VERSION", version: version });
    }
  }
});
