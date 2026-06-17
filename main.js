// =====================================================
//  WagaEX – main.js (POPRAWIONY FLOW SUPABASE)
// =====================================================

import {
  aktualizujHint,
  dodajDoSesji,
  eksportujDoAHK,
  eksportujHistoriaDoAHK,
  kopijNormeZSesji,
  obliczWage,
  wyczyscFormularz,
  zmienMnoznik,
} from "./src/js/calculator.js";

import { AppState } from "./src/js/state.js";
import { StorageManager } from "./src/js/storage.js";
import { toast } from "./src/js/utils.js";

import {
  dodajNormeOptymalnaDoSesji,
  obliczNormeOptymalna,
  przywrocStanNormy,
  wczytajProdukty,
  wyczyscNorme,
} from "./src/js/norma.js";

import {
  aktualizujBadge,
  dodajProduktReczny,
  drukujHistoriaSesje,
  drukujNorme,
  drukujNormeZSesji,
  drukujZbiorcza,
  kopijHistoriaNorme,
  kopijHistoriaSesje,
  renderBaze,
  renderHistorie,
  renderZbiorcza,
  resetSesji,
  toggleNorma,
  togglePodsekcja,
  toggleSesja,
  usunNorme,
  usunSesje,
  usunZBazy,
  wyczyscHistorie,
  zapiszSesje,
} from "./src/js/ui.js";

// ==========================
// INIT INSTANCES
// ==========================
const storage = new StorageManager();
const appState = new AppState(storage);

// ==========================
// GLOBAL FUNCTIONS (HTML)
// ==========================
window.drukujNormeZSesji = (id) => drukujNormeZSesji(appState, id);
window.kopijNormeZSesji = (id) => kopijNormeZSesji(appState, id);
window.usunNorme = (id) => usunNorme(appState, id);
window.toggleNorma = toggleNorma;
window.toggleSesja = toggleSesja;
window.togglePodsekcja = togglePodsekcja;
window.usunSesje = (id) => usunSesje(appState, id);
window.drukujHistoriaSesje = (id) => drukujHistoriaSesje(appState, id);
window.eksportujHistoriaDoAHK = (id) => eksportujHistoriaDoAHK(appState, id);
window.dodajNormeOptymalnaDoSesji = () => dodajNormeOptymalnaDoSesji(appState);
window.kopijHistoriaSesje = (id) => kopijHistoriaSesje(appState, id);
window.kopijHistoriaNorme = (sesjaId, normaId) => kopijHistoriaNorme(appState, sesjaId, normaId);
window.usunZBazy = (key) => usunZBazy(appState, key);

// Aktualizacja wagi z ostrzeżeń
window.aktualizujWageBazy = async (key, nowaWaga) => {
  if (appState.baza[key]) {
    appState.baza[key].waga = nowaWaga;
    appState.baza[key].ostatnioUzyta = new Date().toISOString();
    await appState.saveToStorage();
    // Ukryj ostrzeżenia
    const warnBox = document.querySelector(".waga-warn-box");
    if (warnBox) warnBox.remove();
    document.querySelectorAll(".row-warn").forEach((r) => r.classList.remove("row-warn"));
    document.querySelectorAll(".waga-warn").forEach((s) => s.remove());
    toast(`✓ Waga zaktualizowana: ${nowaWaga} kg`);
  }
};

window.aktualizujWszystkieWagi = async (encodedData) => {
  const updates = JSON.parse(decodeURIComponent(encodedData));
  for (const u of updates) {
    if (appState.baza[u.key]) {
      appState.baza[u.key].waga = u.waga;
      appState.baza[u.key].ostatnioUzyta = new Date().toISOString();
    }
  }
  await appState.saveToStorage();
  // Ukryj ostrzeżenia
  const warnBox = document.querySelector(".waga-warn-box");
  if (warnBox) warnBox.remove();
  document.querySelectorAll(".row-warn").forEach((r) => r.classList.remove("row-warn"));
  document.querySelectorAll(".waga-warn").forEach((s) => s.remove());
  toast(`✓ Zaktualizowano wagi ${updates.length} produktów`);
};

// ==========================
// INIT APP (🔥 FIX HERE)
// ==========================
async function init() {
  // 🔥 KLUCZ: czekamy na Supabase i historię
  await appState.init();

  // ==========================
  // HAMBURGER MENU (slide from left)
  // ==========================
  const hamburger = document.getElementById("btnHamburger");
  const sidebar = document.querySelector(".sidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");

  function toggleSidebar() {
    hamburger.classList.toggle("open");
    sidebar.classList.toggle("open");
    sidebarOverlay.classList.toggle("open");
  }

  function closeSidebar() {
    hamburger.classList.remove("open");
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("open");
  }

  hamburger.addEventListener("click", toggleSidebar);
  sidebarOverlay.addEventListener("click", closeSidebar);

  // Zamknij sidebar po kliknięciu w zakładkę (mobile)
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", closeSidebar);
  });

  // ==========================
  // LOGO SPARKS ANIMATION (canvas)
  // ==========================
  const logoCanvas = document.getElementById("logoSparksCanvas");
  if (logoCanvas) {
    const ctx = logoCanvas.getContext("2d");
    let W, H;
    const sparks = [];

    function resizeLogoCanvas() {
      W = logoCanvas.width = logoCanvas.offsetWidth;
      H = logoCanvas.height = logoCanvas.offsetHeight;
    }
    resizeLogoCanvas();
    window.addEventListener("resize", resizeLogoCanvas);

    function LogoSpark() {
      this.reset = function () {
        this.x = Math.random() * W;
        this.y = Math.random() * H;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = Math.random() * 0.8 + 0.2;
        this.life = 1;
        this.decay = Math.random() * 0.012 + 0.005;
        this.size = Math.random() * 1.8 + 0.4;
      };
      this.reset();
      this.life = Math.random();
    }

    for (let i = 0; i < 30; i++) sparks.push(new LogoSpark());

    function animateLogoSparks() {
      ctx.clearRect(0, 0, W, H);
      const accentColor = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#00d4a0";
      sparks.forEach(function (p) {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0 || p.y > H) p.reset();
        ctx.globalAlpha = p.life * 0.4;
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      requestAnimationFrame(animateLogoSparks);
    }
    animateLogoSparks();
  }

  // ==========================
  // ANIMOWANE TŁO (constellation) + przełącznik
  // ==========================
  bgAktywna = (localStorage.getItem("wagaex_anim") || "on") !== "off";
  const animCheckbox = document.getElementById("btnAnim");
  if (animCheckbox) {
    animCheckbox.checked = bgAktywna;
    animCheckbox.addEventListener("change", () =>
      setBgAnimacja(animCheckbox.checked),
    );
  }
  initBackgroundFX();

  // ==========================
  // NAVIGATION
  // ==========================
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".nav-btn")
        .forEach((b) => b.classList.remove("active"));

      document
        .querySelectorAll(".tab-content")
        .forEach((t) => t.classList.remove("active"));

      btn.classList.add("active");

      const tab = btn.dataset.tab;
      document.getElementById("tab-" + tab).classList.add("active");

      if (tab === "zbiorcza") renderZbiorcza(appState);
      if (tab === "historia") renderHistorie(appState);
      if (tab === "baza") renderBaze(appState);
    });
  });

  // ==========================
  // MULTIPLIER
  // ==========================
  document
    .getElementById("btnMinus")
    .addEventListener("click", () => zmienMnoznik(-1));

  document
    .getElementById("btnPlus")
    .addEventListener("click", () => zmienMnoznik(1));

  document
    .getElementById("multiplier")
    .addEventListener("input", aktualizujHint);

  document.getElementById("multiplier").addEventListener("blur", () => {
    const el = document.getElementById("multiplier");
    el.value = Math.max(1, Math.min(8, parseInt(el.value) || 1));
    aktualizujHint();
  });

  aktualizujHint();

  // ==========================
  // CALCULATOR
  // ==========================
  document
    .getElementById("btnOblicz")
    .addEventListener("click", () => obliczWage(appState));

  document
    .getElementById("btnWyczysc")
    .addEventListener("click", () => wyczyscFormularz(appState));

  document
    .getElementById("btnDodajDoSesji")
    .addEventListener("click", () => dodajDoSesji(appState));

  document
    .getElementById("btnDrukujNorme")
    .addEventListener("click", () => drukujNorme(appState));

  document
    .getElementById("btnResetSesji")
    .addEventListener("click", () => resetSesji(appState));

  document
    .getElementById("btnEksportujAHK")
    .addEventListener("click", () => eksportujDoAHK(appState));

  document.getElementById("btnIdZbiorówka").addEventListener("click", () => {
    document
      .querySelectorAll(".nav-btn")
      .forEach((b) => b.classList.remove("active"));

    document
      .querySelectorAll(".tab-content")
      .forEach((t) => t.classList.remove("active"));

    document.querySelector('[data-tab="zbiorcza"]').classList.add("active");
    document.getElementById("tab-zbiorcza").classList.add("active");

    renderZbiorcza(appState);
  });

  // ==========================
  // ZBIORÓWKA
  // ==========================
  document
    .getElementById("btnDrukujZbiorcza")
    .addEventListener("click", () => drukujZbiorcza(appState));

  document
    .getElementById("btnZapiszSesje")
    .addEventListener("click", () => zapiszSesje(appState));

  // ==========================
  // HISTORIA
  // ==========================
  document
    .getElementById("btnWyczyscHistorie")
    .addEventListener("click", () => wyczyscHistorie(appState));

  document
    .getElementById("historiaSzukaj")
    .addEventListener("input", () => renderHistorie(appState));

  // ==========================
  // BAZA SEARCH + ADD
  // ==========================
  document
    .getElementById("bazaSzukaj")
    .addEventListener("input", () => renderBaze(appState));

  document
    .getElementById("btnDodajProdukt")
    .addEventListener("click", () => dodajProduktReczny(appState));

  // ==========================
  // NORMA OPTYMALNA
  // ==========================
  document
    .getElementById("btnNormaWczytaj")
    .addEventListener("click", () => wczytajProdukty(appState));

  document
    .getElementById("btnNormaOblicz")
    .addEventListener("click", () => obliczNormeOptymalna(appState));

  document
    .getElementById("btnNormaWyczysc")
    .addEventListener("click", () => wyczyscNorme());

  // Przywróć ostatni stan zakładki Norma optymalna (localStorage)
  przywrocStanNormy(appState);

  // ==========================
  // THEME TOGGLE
  // ==========================
  const savedTheme = localStorage.getItem("wagaex_theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  const themeCheckbox = document.getElementById("btnTheme");
  themeCheckbox.checked = savedTheme === "dark";

  themeCheckbox.addEventListener("change", () => {
    const next = themeCheckbox.checked ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("wagaex_theme", next);
  });

  // ==========================
  // SCROLL TO TOP (Baza)
  // ==========================
  const mainEl = document.querySelector(".main");
  const scrollBtn = document.getElementById("btnScrollTop");

  mainEl.addEventListener("scroll", () => {
    const bazaActive = document.getElementById("tab-baza").classList.contains("active");
    if (bazaActive && mainEl.scrollTop > 200) {
      scrollBtn.classList.add("visible");
    } else {
      scrollBtn.classList.remove("visible");
    }
  });

  scrollBtn.addEventListener("click", () => {
    mainEl.scrollTo({ top: 0, behavior: "smooth" });
  });

  // ==========================
  // FIRST RENDER (🔥 IMPORTANT)
  // ==========================
  renderBaze(appState);
  aktualizujBadge(appState);
}

// ==========================
// ANIMOWANE TŁO – pole dryfujących cząsteczek + linie (constellation)
// ==========================
let bgRafId = null; // id pętli animacji (null = zatrzymana)
let bgAktywna = true; // czy animacja ma działać
let bgStart = null; // funkcja startująca pętlę (ustawiana w initBackgroundFX)

// Włącz/wyłącz animację tła i zapamiętaj wybór.
function setBgAnimacja(on) {
  bgAktywna = on;
  try {
    localStorage.setItem("wagaex_anim", on ? "on" : "off");
  } catch {
    // tryb prywatny — ignorujemy
  }

  if (on) {
    bgStart?.();
  } else {
    if (bgRafId) cancelAnimationFrame(bgRafId);
    bgRafId = null;
    const canvas = document.getElementById("bgCanvas");
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
}

function initBackgroundFX() {
  const canvas = document.getElementById("bgCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let W = 0,
    H = 0,
    dpr = 1;
  let czastki = [];
  const DYSTANS = 140; // maks. odległość łączenia liniami (px)

  function nowaCzastka() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.6 + 0.6,
      tw: Math.random() * Math.PI * 2, // faza migotania
    };
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Gęstość zależna od powierzchni ekranu (z rozsądnymi limitami)
    const ile = Math.max(45, Math.min(110, Math.round((W * H) / 22000)));
    czastki = Array.from({ length: ile }, nowaCzastka);
  }

  function kolorAkcentu() {
    return (
      getComputedStyle(document.documentElement)
        .getPropertyValue("--accent")
        .trim() || "#00d4a0"
    );
  }

  function klatka() {
    if (!bgAktywna) {
      bgRafId = null;
      return;
    }
    ctx.clearRect(0, 0, W, H);
    const kolor = kolorAkcentu();

    // Linie między bliskimi cząsteczkami
    ctx.strokeStyle = kolor;
    ctx.lineWidth = 1;
    for (let i = 0; i < czastki.length; i++) {
      const a = czastki[i];
      a.x += a.vx;
      a.y += a.vy;
      a.tw += 0.02;

      // Zawijanie na krawędziach
      if (a.x < -10) a.x = W + 10;
      else if (a.x > W + 10) a.x = -10;
      if (a.y < -10) a.y = H + 10;
      else if (a.y > H + 10) a.y = -10;

      for (let j = i + 1; j < czastki.length; j++) {
        const b = czastki[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d < DYSTANS) {
          ctx.globalAlpha = (1 - d / DYSTANS) * 0.2;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // Migoczące punkty
    ctx.fillStyle = kolor;
    for (const p of czastki) {
      ctx.globalAlpha = 0.5 + Math.sin(p.tw) * 0.3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    bgRafId = requestAnimationFrame(klatka);
  }

  bgStart = () => {
    if (!bgRafId) bgRafId = requestAnimationFrame(klatka);
  };

  window.addEventListener("resize", resize);
  resize();
  if (bgAktywna) bgStart();
}

// ==========================
// START APP
// ==========================
document.addEventListener("DOMContentLoaded", init);
