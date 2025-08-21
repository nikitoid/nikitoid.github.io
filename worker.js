// worker.js - Логика для фонового потока

// Импортируем библиотеку для конвертации.
// importScripts обязателен для воркеров, так как у них нет доступа к DOM и <script> тегам.
importScripts(
  "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js"
);

// Слушаем сообщения от основного потока
self.onmessage = async (event) => {
  const { file, quality } = event.data;

  try {
    // Выполняем тяжелую операцию конвертации
    const conversionResult = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: quality,
    });

    // Формируем объект с результатом
    const result = {
      success: true,
      originalFile: {
        name: file.name,
        size: file.size,
      },
      convertedBlob: conversionResult,
      convertedSize: conversionResult.size,
      filename: file.name.replace(/\.(heic|heif)$/i, ".jpg"),
    };

    // Отправляем результат обратно в основной поток
    self.postMessage(result);
  } catch (error) {
    console.error("Ошибка конвертации в воркере:", file.name, error);
    // В случае ошибки отправляем сообщение об этом
    self.postMessage({
      success: false,
      filename: file.name,
      error: error.message,
    });
  }
};
