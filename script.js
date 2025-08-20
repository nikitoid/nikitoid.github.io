// script.js

// Оборачиваем весь код в IIFE для инкапсуляции
(() => {
  const APP_VERSION = "0.0.5";

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
  let directoryHandle = null; // Для File System Access API
  let currentViewerIndex = -1;

  // --- Настройки ---
  const defaultSettings = {
    theme: "auto", // auto, light, dark
    defaultQuality: 90,
    saveMethod: "browser", // browser, filesystem
  };
  let settings = {};

  // --- Инициализация ---
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
  });

  // --- Функции Настроек ---
  function loadSettings() {
    const savedSettings = JSON.parse(localStorage.getItem("converterSettings"));
    settings = { ...defaultSettings, ...savedSettings };
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

  async function convertFiles() {
    convertBtn.disabled = true;
    convertBtn.textContent = "Конвертация...";
    gallery.innerHTML = '<div class="loader"></div>';
    galleryHeader.style.display = "none";
    convertedFiles = [];

    const quality = parseInt(qualitySlider.value) / 100;

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
    }

    renderGallery();
    convertBtn.textContent = "Конвертировать";
    dropZone.querySelector("p").textContent =
      "Перетащите .HEIC файлы сюда или нажмите для выбора";
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
        img.onload = () => URL.revokeObjectURL(img.src);
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

  // --- Логика Скачивания и File System API ---
  function checkFileSystemApiSupport() {
    const isSupported = "showDirectoryPicker" in window;
    if (!isSupported) {
      fsApiSupport.textContent =
        "Ваш браузер не поддерживает прямое сохранение.";
      saveMethodToggle.disabled = true;
      savePathBtn.disabled = true;
      if (settings.saveMethod === "filesystem") {
        settings.saveMethod = "browser";
        saveSettings();
        updateUIFromSettings();
      }
    } else {
      fsApiSupport.textContent = "Сохранение напрямую в выбранную папку.";
    }
  }

  async function selectSavePath() {
    try {
      directoryHandle = await window.showDirectoryPicker();
      currentSavePath.textContent = directoryHandle.name;
      // В реальном приложении нужно сохранить handle в IndexedDB для персистентности
    } catch (error) {
      console.log("Выбор папки отменен", error);
    }
  }

  async function downloadFile(file) {
    if (settings.saveMethod === "filesystem" && directoryHandle) {
      try {
        const fileHandle = await directoryHandle.getFileHandle(file.filename, {
          create: true,
        });
        const writable = await fileHandle.createWritable();
        await writable.write(file.convertedBlob);
        await writable.close();
      } catch (error) {
        console.error("Ошибка прямого сохранения:", error);
        // Если ошибка, откатываемся к обычному скачиванию
        downloadWithBrowser(file);
      }
    } else {
      downloadWithBrowser(file);
    }
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

    // Drag & Drop
    dropZone.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => handleFiles(e.target.files));
    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      dropZone.addEventListener(
        eventName,
        (e) => {
          e.preventDefault();
          e.stopPropagation();
        },
        false
      );
    });
    ["dragenter", "dragover"].forEach((eventName) => {
      dropZone.addEventListener(eventName, () =>
        dropZone.classList.add("hover")
      );
    });
    ["dragleave", "drop"].forEach((eventName) => {
      dropZone.addEventListener(eventName, () =>
        dropZone.classList.remove("hover")
      );
    });
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
      if (currentViewerIndex > -1) {
        downloadFile(convertedFiles[currentViewerIndex]);
      }
    });
    viewerModal.addEventListener("click", (e) => {
      if (e.target === viewerModal) closeViewer();
    });

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
