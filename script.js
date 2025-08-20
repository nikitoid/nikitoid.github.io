// --- РЕГИСТРАЦИЯ SERVICE WORKER ---
if (
  "serviceWorker" in navigator &&
  (location.protocol === "https:" || location.hostname === "localhost")
) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log(
          "ServiceWorker зарегистрирован успешно:",
          registration.scope
        );
      })
      .catch((error) => {
        console.error("Ошибка регистрации ServiceWorker:", error);
      });
  });
}

// --- ЛОГИКА УСТАНОВКИ PWA ---
const installBanner = document.getElementById("install-banner");
const installButton = document.getElementById("install-button");
const closeBannerButton = document.getElementById("close-banner-button");
const installFab = document.getElementById("install-fab");
let deferredPrompt;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Функция для показа баннера
  const showInstallBanner = () => {
    if (
      !window.matchMedia("(display-mode: standalone)").matches &&
      !window.navigator.standalone
    ) {
      installBanner.classList.remove("hidden");
    }
  };

  // Проверяем, является ли устройство Android
  const isAndroid = /android/i.test(navigator.userAgent);

  if (isAndroid) {
    // На Android ждем 30 секунд, чтобы обойти "эвристику вовлеченности"
    console.log("Android устройство. Показ баннера через 30 секунд.");
    setTimeout(showInstallBanner, 30000);
  } else {
    // На других устройствах (десктоп) показываем сразу
    console.log("Десктоп. Показ баннера немедленно.");
    showInstallBanner();
  }
});

function handleInstall() {
  if (!deferredPrompt) return;
  installBanner.classList.add("hidden");
  installFab.classList.add("hidden");
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then((choiceResult) => {
    if (choiceResult.outcome === "accepted") {
      console.log("Пользователь согласился на установку");
    } else {
      console.log("Пользователь отказался от установки");
      installFab.classList.remove("hidden");
    }
    deferredPrompt = null;
  });
}

installButton.addEventListener("click", handleInstall);
installFab.addEventListener("click", handleInstall);

closeBannerButton.addEventListener("click", () => {
  installBanner.classList.add("hidden");
  if (deferredPrompt) {
    installFab.classList.remove("hidden");
  }
});

window.addEventListener("appinstalled", () => {
  console.log("Приложение успешно установлено!");
  installBanner.classList.add("hidden");
  installFab.classList.add("hidden");
  deferredPrompt = null;
});

// --- ОСНОВНАЯ ЛОГИКА ПРИЛОЖЕНИЯ ---
const fileInput = document.getElementById("file-input");
const dropZone = document.getElementById("drop-zone");
const statusDiv = document.getElementById("status");
const resultsDiv = document.getElementById("results");

["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) =>
  dropZone.addEventListener(eventName, preventDefaults, false)
);
function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}
["dragenter", "dragover"].forEach((eventName) =>
  dropZone.addEventListener(
    eventName,
    () => dropZone.classList.add("border-teal-500", "bg-teal-50"),
    false
  )
);
["dragleave", "drop"].forEach((eventName) =>
  dropZone.addEventListener(
    eventName,
    () => dropZone.classList.remove("border-teal-500", "bg-teal-50"),
    false
  )
);
dropZone.addEventListener(
  "drop",
  (e) => handleFiles(e.dataTransfer.files),
  false
);
fileInput.addEventListener("change", (e) => handleFiles(e.target.files));

async function handleFiles(files) {
  if (files.length === 0) return;
  resultsDiv.innerHTML = "";
  statusDiv.innerHTML = `<div class="flex items-center justify-center"><svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Обработка ${files.length} файлов...</span></div>`;

  const filePromises = Array.from(files)
    .filter((file) => /\.(heic|heif)$/i.test(file.name))
    .map((file) =>
      convertFile(file)
        .then((card) => ({ status: "fulfilled", value: card }))
        .catch((errorCard) => ({ status: "rejected", value: errorCard }))
    );

  const results = await Promise.all(filePromises);

  resultsDiv.innerHTML = ""; // Очищаем перед добавлением
  let convertedCount = 0;
  results.forEach((result) => {
    resultsDiv.appendChild(result.value);
    if (result.status === "fulfilled") {
      convertedCount++;
    }
  });

  if (filePromises.length > 0) {
    statusDiv.textContent = `Готово! Успешно сконвертировано ${convertedCount} из ${filePromises.length} файлов.`;
  } else {
    statusDiv.textContent = "Не найдено HEIC/HEIF файлов для конвертации.";
  }
}

async function convertFile(file) {
  try {
    const conversionResult = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.9,
    });
    const url = URL.createObjectURL(conversionResult);
    const newFileName = file.name.replace(/\.(heic|heif)$/i, ".jpeg");
    const card = document.createElement("div");
    card.className =
      "bg-white rounded-lg shadow-md overflow-hidden fade-in border border-gray-200";
    card.innerHTML = `<img src="${url}" alt="Сконвертированное изображение" class="w-full h-48 object-cover"><div class="p-4"><p class="text-sm font-medium text-gray-800 truncate" title="${newFileName}">${newFileName}</p><a href="${url}" download="${newFileName}" class="mt-3 inline-block w-full text-center bg-teal-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-teal-700 transition-colors">Скачать</a></div>`;
    return card;
  } catch (error) {
    console.error(`Ошибка конвертации файла ${file.name}:`, error);
    const errorCard = document.createElement("div");
    errorCard.className =
      "bg-red-50 rounded-lg p-4 fade-in border border-red-200";
    errorCard.innerHTML = `<p class="text-sm font-bold text-red-700 truncate">${file.name}</p><p class="text-xs text-red-600 mt-1">Не удалось сконвертировать.</p>`;
    return Promise.reject(errorCard);
  }
}
