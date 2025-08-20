// Определяем текущую версию приложения
const APP_VERSION = "5.0";

// --- РЕГИСТРАЦИЯ SERVICE WORKER И ЛОГИКА ОБНОВЛЕНИЯ ---
if (
  "serviceWorker" in navigator &&
  (location.protocol === "https:" || location.hostname === "localhost")
) {
  // Регистрируем SW
  navigator.serviceWorker
    .register("/sw.js")
    .then((reg) => {
      // Эта функция будет вызываться при каждой загрузке страницы
      // и принудительно проверять наличие новой версии SW на сервере.
      // Это решает проблему с кэшированием sw.js на GitHub Pages.
      reg.update();

      // Слушаем событие, которое говорит о нахождении нового SW.
      reg.onupdatefound = () => {
        const installingWorker = reg.installing;
        installingWorker.onstatechange = () => {
          if (
            installingWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // Новый SW установлен и ожидает активации.
            // Показываем пользователю баннер с предложением обновиться.
            showUpdateBanner(reg);
          }
        };
      };
    })
    .catch((error) => {
      console.error("Ошибка регистрации ServiceWorker:", error);
    });

  // Перезагрузка страницы после того, как новый SW вступил в силу
  let refreshing;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    window.location.reload();
    refreshing = true;
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
  const showInstallPrompt = () => {
    if (
      !window.matchMedia("(display-mode: standalone)").matches &&
      !window.navigator.standalone
    ) {
      installBanner.classList.remove("hidden");
    }
  };
  const isAndroid = /android/i.test(navigator.userAgent);
  if (isAndroid) {
    setTimeout(showInstallPrompt, 30000);
  } else {
    showInstallPrompt();
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
  installBanner.classList.add("hidden");
  installFab.classList.add("hidden");
  deferredPrompt = null;
});

// --- ФУНКЦИИ ДЛЯ БАННЕРА ОБНОВЛЕНИЯ ---
const updateBanner = document.getElementById("update-banner");
function showUpdateBanner(reg) {
  updateBanner.classList.remove("hidden");
  document.getElementById("update-button").addEventListener("click", () => {
    if (reg.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
    }
    updateBanner.classList.add("hidden");
  });
}

// --- ОСНОВНАЯ ЛОГИКА ПРИЛОЖЕНИЯ ---
const fileInput = document.getElementById("file-input");
const dropZone = document.getElementById("drop-zone");
const statusDiv = document.getElementById("status");
const resultsDiv = document.getElementById("results");
const progressContainer = document.getElementById("progress-container");
const progressBar = document.getElementById("progress-bar");
const progressText = document.getElementById("progress-text");
const appVersionElement = document.getElementById("app-version");

// Устанавливаем версию в подвале
if (appVersionElement) {
  appVersionElement.textContent = `Версия ${APP_VERSION}`;
}

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
  const heicFiles = Array.from(files).filter((file) =>
    /\.(heic|heif)$/i.test(file.name)
  );
  if (heicFiles.length === 0) {
    statusDiv.textContent = "Не найдено HEIC/HEIF файлов для конвертации.";
    return;
  }

  resultsDiv.innerHTML = "";
  statusDiv.innerHTML = `<span>Обработка ${heicFiles.length} файлов...</span>`;

  progressContainer.classList.remove("hidden");
  progressBar.style.width = "0%";
  progressText.textContent = `Обработано 0 из ${heicFiles.length}`;

  let processedCount = 0;
  let convertedCount = 0;

  for (const file of heicFiles) {
    try {
      const card = await convertFile(file);
      resultsDiv.appendChild(card);
      convertedCount++;
    } catch (errorCard) {
      resultsDiv.appendChild(errorCard);
    }
    processedCount++;
    const percentage = Math.round((processedCount / heicFiles.length) * 100);
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `Обработано ${processedCount} из ${heicFiles.length}`;
  }

  statusDiv.textContent = `Готово! Успешно сконвертировано ${convertedCount} из ${heicFiles.length} файлов.`;

  setTimeout(() => {
    progressContainer.classList.add("hidden");
  }, 1500);
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
