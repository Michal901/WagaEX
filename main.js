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

import {
  aktualizujBadge,
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

// ==========================
// INIT APP (🔥 FIX HERE)
// ==========================
async function init() {
  // 🔥 KLUCZ: czekamy na Supabase i historię
  await appState.init();

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

  // ==========================
  // BAZA SEARCH
  // ==========================
  document
    .getElementById("bazaSzukaj")
    .addEventListener("input", () => renderBaze(appState));

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
