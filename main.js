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
  wyczyscHistorie,
  zapiszSesje,
} from "./ui.js";

// =========================
const storage = new StorageManager();
const appState = new AppState(storage);

// =========================
// SYNC (🔥 KLUCZ)
async function syncBaza() {
  appState.baza = await storage.load("baza", {});
  renderBaze(appState);
  aktualizujBadge(appState);
}

// =========================
// GLOBAL DELETE FIX
window.usunZBazy = async (id) => {
  await storage.deleteProdukt(id);
  await syncBaza();
};

// =========================
window.drukujNormeZSesji = (id) => drukujNormeZSesji(appState, id);
window.usunNorme = (id) => usunNorme(appState, id);
window.toggleNorma = toggleNorma;
window.toggleSesja = toggleSesja;
window.usunSesje = (id) => usunSesje(appState, id);
window.drukujHistoriaSesje = (id) => drukujHistoriaSesje(appState, id);

// =========================
async function init() {
  await syncBaza();

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

  document
    .getElementById("btnOblicz")
    .addEventListener("click", () => obliczWage(appState));

  document
    .getElementById("btnWyczysc")
    .addEventListener("click", () => wyczyscFormularz(appState));

  document
    .getElementById("btnDodajDoSesji")
    .addEventListener("click", async () => {
      await dodajDoSesji(appState);
      await syncBaza();
    });

  document
    .getElementById("btnResetSesji")
    .addEventListener("click", () => resetSesji(appState));

  document
    .getElementById("btnWyczyscHistorie")
    .addEventListener("click", () => wyczyscHistorie(appState));

  document
    .getElementById("bazaSzukaj")
    .addEventListener("input", () => renderBaze(appState));
}

document.addEventListener("DOMContentLoaded", init);
