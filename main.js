// =====================================================
//  WagaEX – main.js (POPRAWIONY FLOW SUPABASE)
// =====================================================

import {
  aktualizujHint,
  dodajDoSesji,
  kopijNormeZSesji,
  obliczWage,
  wyczyscFormularz,
  zmienMnoznik,
} from "./calculator.js";

import { AppState } from "./state.js";
import { StorageManager } from "./storage.js";
import { toast } from "./utils.js";

import {
  aktualizujBadge,
  dodajProduktReczny,
  drukujHistoriaSesje,
  drukujNorme,
  drukujNormeZSesji,
  drukujZbiorcza,
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
} from "./ui.js";

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
// START APP
// ==========================
document.addEventListener("DOMContentLoaded", init);
