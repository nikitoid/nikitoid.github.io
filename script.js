// script.js

// Оборачиваем весь код в IIFE для инкапсуляции
(() => {
  const APP_VERSION = "0.0.7";

  // --- DOM Элементы ---
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  const mainPage = document.getElementById("main-page");
  const settingsPage = document.getElementById("settings-page");
  const settingsBtn = document.getElementById("settings-btn");
  const backBtn = document.getElementById("back-btn");
  const fileInput = document.getElementById("file-input");
  const dropZone = document.getElementById("drop-zone");
  const qualitySlider = document.getElementById("quality-slider");
  const qualityValue = document.getElementById("quality-value");
  const convertBtn = document.getElementById("convert-btn");
  const gallery = document.getElementById("gallery");
  const galleryHeader = document.querySelector(".gallery-header");
  const downloadAllBtn = document.getElementById("download-all-btn");
  const viewerModal = document.getElementById("viewer-modal");
  const closeViewerBtn = document.getElementById("close-viewer-btn");
  const viewerImg = document.getElementById("viewer-img");
  const viewerFilename = document.getElementById("viewer-filename");
  const viewerSizes = document.getElementById("viewer-sizes");
  const viewerDownloadBtn = document.getElementById("viewer-download-btn");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const progressContainer = document.getElementById("progress-container");
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");

  // --- Элементы настроек ---
  const defaultQualitySlider = document.getElementById(
    "default-quality-slider"
  );
  const defaultQualityValue = document.getElementById("default-quality-value");
  const saveMethodToggle = document.getElementById("save-method-toggle");
  const fsApiSupport = document.getElementById("fs-api-support");
  const savePathBtn = document.getElementById("save-path-btn");
  const currentSavePath = document.getElementById("current-save-path");

  // --- Состояние приложения ---
  let filesToConvert = [];
  let convertedFiles = [];
  let directoryHandle = null;
  let currentViewerIndex = -1;

  // --- Настройки ---
  const defaultSettings = {
    theme: "auto",
    defaultQuality: 90,
    saveMethod: "browser",
  };
  let settings = {};

  // --- IndexedDB для сохранения directoryHandle ---
  const DB_NAME = "ConverterDB";
  const STORE_NAME = "FileSystemHandles";
  let db;

  async function initDB() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        console.warn("IndexedDB не поддерживается в этом браузере.");
        return reject("IndexedDB not supported");
      }
      const request = indexedDB.open(DB_NAME, 1);
      request.onerror = (event) =>
        reject(`Ошибка открытия IndexedDB: ${event.target.error}`);
      request.onsuccess = (event) => {
        db = event.target.result;
        resolve();
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  }

  async function saveHandle(handle) {
    if (!db) return;
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    await store.put(handle, "directoryHandle");
    return tx.complete;
  }

  async function getHandle() {
    if (!db) return null;
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get("directoryHandle");
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  }

  async function verifyPermission(handle) {
    if (!handle || typeof handle.queryPermission !== "function") return false;
    const options = { mode: "readwrite" };
    if ((await handle.queryPermission(options)) === "granted") {
      return true;
    }
    if ((await handle.requestPermission(options)) === "granted") {
      return true;
    }
    return false;
  }

  async function initializeAsyncParts() {
    try {
      await initDB();
      const handle = await getHandle();
      if (handle) {
        directoryHandle = handle;
        currentSavePath.textContent = directoryHandle.name;
      }
    } catch (error) {
      console.error("Ошибка при инициализации базы данных:", error);
      directoryHandle = null;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById(
      "version-display"
    ).textContent = `Версия: ${APP_VERSION}`;
    loadSettings();
    applyTheme();
    setupEventListeners();
    checkFileSystemApiSupport();
    updateUIFromSettings();
    registerServiceWorker();

    initializeAsyncParts();
  });

  // --- Уведомления (Toast) ---
  function showToast(message) {
    const toastContainer = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = "toast-message";
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("show");
    }, 10);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        if (toast.parentElement) {
          toast.parentElement.removeChild(toast);
        }
      }, 500);
    }, 3000);
  }

  // --- Функции Настроек ---
  function loadSettings() {
    try {
      const savedSettings = JSON.parse(
        localStorage.getItem("converterSettings")
      );
      settings = { ...defaultSettings, ...savedSettings };
    } catch (e) {
      settings = { ...defaultSettings };
    }
  }

  function saveSettings() {
    localStorage.setItem("converterSettings", JSON.stringify(settings));
  }

  function updateUIFromSettings() {
    qualitySlider.value = settings.defaultQuality;
    qualityValue.textContent = settings.defaultQuality;
    defaultQualitySlider.value = settings.defaultQuality;
    defaultQualityValue.textContent = settings.defaultQuality;
    saveMethodToggle.checked = settings.saveMethod === "filesystem";
    updateButtonLabels();
  }

  function updateButtonLabels() {
    const isFileSystem = settings.saveMethod === "filesystem";
    downloadAllBtn.textContent = isFileSystem ? "Сохранить всё" : "Скачать всё";
    viewerDownloadBtn.textContent = isFileSystem ? "Сохранить" : "Скачать";
  }

  // --- Логика Тем ---
  function applyTheme() {
    document.body.classList.remove("light-theme", "dark-theme");
    let themeToApply = settings.theme;
    if (themeToApply === "auto") {
      themeToApply = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    document.body.classList.add(themeToApply + "-theme");
  }

  function toggleTheme() {
    const currentTheme = document.body.classList.contains("dark-theme")
      ? "dark"
      : "light";
    settings.theme = currentTheme === "dark" ? "light" : "dark";
    saveSettings();
    applyTheme();
  }

  // --- Навигация ---
  function showPage(pageToShow) {
    document
      .querySelectorAll(".page")
      .forEach((page) => page.classList.remove("active"));
    pageToShow.classList.add("active");
  }

  // --- Логика Файлов и Конвертации ---
  function handleFiles(files) {
    filesToConvert = Array.from(files).filter((file) =>
      /\.(heic|heif)$/i.test(file.name)
    );
    if (filesToConvert.length > 0) {
      dropZone.querySelector(
        "p"
      ).textContent = `Выбрано файлов: ${filesToConvert.length}`;
      convertBtn.disabled = false;
    } else {
      dropZone.querySelector("p").textContent =
        "Пожалуйста, выберите файлы формата .HEIC или .HEIF";
      convertBtn.disabled = true;
    }
  }

  function updateProgress(current, total) {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `Обработано: ${current} из ${total}`;
  }

  async function convertFiles() {
    convertBtn.disabled = true;
    convertBtn.textContent = "Конвертация...";
    gallery.innerHTML = "";
    galleryHeader.style.display = "none";
    progressContainer.style.display = "block";
    updateProgress(0, filesToConvert.length);
    convertedFiles = [];

    const quality = parseInt(qualitySlider.value) / 100;

    let processedCount = 0;
    for (const file of filesToConvert) {
      try {
        const conversionResult = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: quality,
        });

        convertedFiles.push({
          originalFile: file,
          convertedBlob: conversionResult,
          originalSize: file.size,
          convertedSize: conversionResult.size,
          filename: file.name.replace(/\.(heic|heif)$/i, ".jpg"),
        });
      } catch (error) {
        console.error("Ошибка конвертации файла:", file.name, error);
      }
      processedCount++;
      updateProgress(processedCount, filesToConvert.length);
    }

    renderGallery();
    convertBtn.textContent = "Конвертировать";
    dropZone.querySelector("p").textContent =
      "Перетащите .HEIC файлы сюда или нажмите для выбора";
    setTimeout(() => {
      progressContainer.style.display = "none";
    }, 1000);
  }

  // --- Галерея и Просмотр ---
  function renderGallery() {
    gallery.innerHTML = "";
    if (convertedFiles.length > 0) {
      galleryHeader.style.display = "flex";
      convertedFiles.forEach((file, index) => {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file.convertedBlob);
        img.dataset.index = index;
        gallery.appendChild(img);
      });
    } else {
      galleryHeader.style.display = "none";
      gallery.innerHTML = "<p>Не удалось сконвертировать файлы.</p>";
    }
  }

  function openViewer(index) {
    currentViewerIndex = parseInt(index);
    const file = convertedFiles[currentViewerIndex];
    if (!file) return;

    viewerImg.src = URL.createObjectURL(file.convertedBlob);
    viewerFilename.textContent = file.filename;
    viewerSizes.textContent = `${(file.originalSize / 1024 / 1024).toFixed(
      2
    )} MB → ${(file.convertedSize / 1024 / 1024).toFixed(2)} MB`;
    viewerModal.style.display = "flex";
  }

  function closeViewer() {
    URL.revokeObjectURL(viewerImg.src);
    viewerModal.style.display = "none";
  }

  function showNextImage() {
    if (convertedFiles.length === 0) return;
    currentViewerIndex = (currentViewerIndex + 1) % convertedFiles.length;
    openViewer(currentViewerIndex);
  }

  function showPrevImage() {
    if (convertedFiles.length === 0) return;
    currentViewerIndex =
      (currentViewerIndex - 1 + convertedFiles.length) % convertedFiles.length;
    openViewer(currentViewerIndex);
  }

  // --- Логика Скачивания и File System API ---
  function checkFileSystemApiSupport() {
    const isSupported = "showDirectoryPicker" in window;
    if (!isSupported) {
      fsApiSupport.textContent = "Ваш браузер не поддерживает этот метод.";
      saveMethodToggle.disabled = true;
      savePathBtn.disabled = true;
      if (settings.saveMethod === "filesystem") {
        settings.saveMethod = "browser";
        saveSettings();
        updateUIFromSettings();
      }
    } else {
      fsApiSupport.textContent = "Сохранение в выбранную папку.";
    }
  }

  async function selectSavePath() {
    try {
      const handle = await window.showDirectoryPicker();
      await saveHandle(handle);
      directoryHandle = handle;
      currentSavePath.textContent = directoryHandle.name;
    } catch (error) {
      console.log("Выбор папки отменен", error);
    }
  }

  async function downloadFile(file) {
    if (settings.saveMethod === "filesystem") {
      if (!directoryHandle) {
        directoryHandle = await getHandle();
      }
      if (await verifyPermission(directoryHandle)) {
        try {
          const fileHandle = await directoryHandle.getFileHandle(
            file.filename,
            { create: true }
          );
          const writable = await fileHandle.createWritable();
          await writable.write(file.convertedBlob);
          await writable.close();
          showToast(`Файл "${file.filename}" сохранен.`);
          return;
        } catch (error) {
          console.error("Ошибка прямого сохранения:", error);
          showToast(`Ошибка сохранения файла: ${error.name}`);
        }
      } else {
        showToast("Нет разрешения на запись в папку.");
      }
    }
    downloadWithBrowser(file);
  }

  function downloadWithBrowser(file) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file.convertedBlob);
    link.download = file.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  function downloadAll() {
    convertedFiles.forEach((file) => downloadFile(file));
  }

  // --- Установка обработчиков событий ---
  function setupEventListeners() {
    themeToggleBtn.addEventListener("click", toggleTheme);
    settingsBtn.addEventListener("click", () => showPage(settingsPage));
    backBtn.addEventListener("click", () => showPage(mainPage));

    dropZone.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => handleFiles(e.target.files));
    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });
    ["dragenter", "dragover"].forEach((eName) =>
      dropZone.addEventListener(eName, () => dropZone.classList.add("hover"))
    );
    ["dragleave", "drop"].forEach((eName) =>
      dropZone.addEventListener(eName, () => dropZone.classList.remove("hover"))
    );
    dropZone.addEventListener("drop", (e) => handleFiles(e.dataTransfer.files));

    qualitySlider.addEventListener(
      "input",
      (e) => (qualityValue.textContent = e.target.value)
    );
    convertBtn.addEventListener("click", convertFiles);

    gallery.addEventListener("click", (e) => {
      if (e.target.tagName === "IMG") {
        openViewer(e.target.dataset.index);
      }
    });

    downloadAllBtn.addEventListener("click", downloadAll);

    // Viewer
    closeViewerBtn.addEventListener("click", closeViewer);
    viewerDownloadBtn.addEventListener("click", () => {
      if (currentViewerIndex > -1)
        downloadFile(convertedFiles[currentViewerIndex]);
    });
    viewerModal.addEventListener("click", (e) => {
      if (e.target === viewerModal) closeViewer();
    });
    prevBtn.addEventListener("click", showPrevImage);
    nextBtn.addEventListener("click", showNextImage);

    // Settings
    defaultQualitySlider.addEventListener("input", (e) => {
      defaultQualityValue.textContent = e.target.value;
      settings.defaultQuality = parseInt(e.target.value);
      saveSettings();
      updateUIFromSettings();
    });
    saveMethodToggle.addEventListener("change", (e) => {
      settings.saveMethod = e.target.checked ? "filesystem" : "browser";
      saveSettings();
      updateButtonLabels();
    });
    savePathBtn.addEventListener("click", selectSavePath);
  }

  // --- Service Worker и PWA логика ---
  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((reg) => {
          console.log("Service worker зарегистрирован.");
        })
        .catch((error) => {
          console.log("Ошибка регистрации Service Worker:", error);
        });

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        console.log("Service Worker был обновлен. Перезагрузка страницы...");
        window.location.reload();
      });
    }
  }
})();
