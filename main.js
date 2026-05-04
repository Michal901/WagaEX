// =====================================================
//  WagaEX – main.js (punkt wejścia aplikacji)
//  Flow: norma → oblicz → dodaj do sesji (max 8)
//        → zbiorówka (suma wszystkich norm) → drukuj
// =====================================================

import {
  aktualizujHint,
  dodajDoSesji,
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
  toggleSesja,
  usunNorme,
  usunSesje,
  usunZBazy,
  wyczyscHistorie,
  zapiszSesje,
} from "./ui.js";

// Initialize global instances
const storage = new StorageManager();
const appState = new AppState(storage);

// Funkcje globalne dla onclick w HTML
window.drukujNormeZSesji = (id) => drukujNormeZSesji(appState, id);
window.usunNorme = (id) => usunNorme(appState, id);
window.toggleNorma = toggleNorma;
window.toggleSesja = toggleSesja;
window.usunSesje = (id) => usunSesje(appState, id);
window.drukujHistoriaSesje = (id) => drukujHistoriaSesje(appState, id);
window.usunZBazy = (key) => usunZBazy(appState, key);

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  // Nawigacja
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

  // Liczba norm (mnożnik)
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

  // Kalkulator
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

  // Zbiorówka
  document
    .getElementById("btnDrukujZbiorcza")
    .addEventListener("click", () => drukujZbiorcza(appState));
  document
    .getElementById("btnZapiszSesje")
    .addEventListener("click", () => zapiszSesje(appState));

  // Historia
  document
    .getElementById("btnWyczyscHistorie")
    .addEventListener("click", () => wyczyscHistorie(appState));

  // Baza search
  document
    .getElementById("bazaSzukaj")
    .addEventListener("input", () => renderBaze(appState));

  aktualizujBadge(appState);
});
