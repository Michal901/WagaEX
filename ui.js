// ===== UI MODULE (FIXED DROP-IN) =====
import { agregujProdukty, esc, toast } from "./utils.js";

/* =========================
   GLOBAL WRAPPERS (INLINE FIX)
========================= */
export function bindUIGlobals(appState) {
  window.toggleNorma = (id) => toggleNorma(id);
  window.toggleSesja = (id) => toggleSesja(id);

  window.drukujNormeZSesji = (id) => drukujNormeZSesji(appState, id);
  window.drukujHistoriaSesje = (id) => drukujHistoriaSesje(appState, id);

  window.usunNorme = (id) => usunNorme(appState, id);
  window.usunSesje = (id) => usunSesje(appState, id);

  window.drukujNorme = () => drukujNorme(appState);
  window.drukujZbiorcza = () => drukujZbiorcza(appState);
  window.resetSesji = () => resetSesji(appState);
}

/* =========================
   SESJA
========================= */
export function renderSesjaChips(appState) {
  const pasek = document.getElementById("sesja-pasek");

  if (!appState.biezacaSesja.length) {
    pasek.style.display = "none";
    return;
  }

  pasek.style.display = "block";

  document.getElementById("sesja-licznik").textContent =
    `${appState.biezacaSesja.length} / 8 norm`;

  const lista = document.getElementById("sesja-normy-lista");

  lista.innerHTML = appState.biezacaSesja
    .map((n) => {
      const rows = n.produkty
        .map(
          (p, i) => `
        <tr>
          <td class="mono">${i + 1}</td>
          <td>${esc(p.nazwa)}</td>
          <td class="center mono">${p.ilosc}</td>
          <td class="center mono">${p.waga} kg</td>
          <td class="right mono"><b>${(p.waga * p.ilosc).toFixed(2)} kg</b></td>
        </tr>`,
        )
        .join("");

      return `
      <div class="norma-chip">
        <div class="norma-chip-header" onclick="toggleNorma('${n.id}')">
          <div>
            <span class="norma-chip-nr">${n.label}</span>
            <span class="norma-chip-info">${n.produkty.length} produktów</span>
          </div>

          <div>
            <span class="norma-chip-kg">${n.totalKg.toFixed(2)} kg</span>
          </div>
        </div>

        <div class="norma-body" id="body-norma-${n.id}">
          <table class="results-table">
            <tbody>${rows}</tbody>
          </table>

          <div class="norma-actions">
            <button onclick="drukujNormeZSesji('${n.id}')">🖨</button>
            <button onclick="usunNorme('${n.id}')">🗑</button>
          </div>
        </div>
      </div>`;
    })
    .join("");

  const totalAll = appState.biezacaSesja.reduce((s, n) => s + n.totalKg, 0);

  document.getElementById("sesja-total-kg").innerHTML =
    `Łączna: <b>${totalAll.toFixed(2)} kg</b>`;
}

export function usunNorme(appState, id) {
  appState.biezacaSesja = appState.biezacaSesja.filter((n) => n.id !== id);

  appState.biezacaSesja.forEach((n, i) => {
    n.nr = i + 1;
    n.label = `Norma ${i + 1}`;
  });

  aktualizujBadge(appState);
  renderSesjaChips(appState);
}

/* =========================
   TOGGLES
========================= */
export function toggleNorma(id) {
  document.getElementById(`body-norma-${id}`).classList.toggle("open");
}

export function toggleSesja(id) {
  document.getElementById(`body-${id}`).classList.toggle("open");
}

/* =========================
   PRINTS
========================= */
export function drukujNorme(appState) {
  if (!appState.aktualneWyniki) return toast("Brak danych", true);

  const { produkty, data } = appState.aktualneWyniki;

  drukujListeProduktow(
    produkty.map((p) => ({
      nazwa: p.nazwa,
      waga: p.waga,
      iloscTotal: p.ilosc,
    })),
    "Norma",
    new Date(data).toLocaleString("pl-PL"),
  );
}

export function drukujNormeZSesji(appState, id) {
  const n = appState.biezacaSesja.find((x) => x.id === id);
  if (!n) return;

  drukujListeProduktow(
    n.produkty.map((p) => ({
      nazwa: p.nazwa,
      waga: p.waga,
      iloscTotal: p.ilosc,
    })),
    n.label,
    new Date().toLocaleString("pl-PL"),
  );
}

/* =========================
   ZBIORCZA + HISTORIA
========================= */
export function renderZbiorcza(appState) {
  const el = document.getElementById("zbiorcza-content");

  if (!appState.biezacaSesja.length) {
    el.innerHTML = "Brak danych";
    return;
  }

  const lista = agregujProdukty(appState.biezacaSesja);

  const totalKg = lista.reduce((s, p) => s + p.waga * p.iloscTotal, 0);

  el.innerHTML = `
    <table class="results-table">
      <tbody>
        ${lista
          .map(
            (p, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${esc(p.nazwa)}</td>
            <td class="center">${p.iloscTotal}</td>
            <td class="center">${p.waga}</td>
            <td class="right">${(p.waga * p.iloscTotal).toFixed(2)}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4"></td>
          <td class="right"><b>${totalKg.toFixed(2)} kg</b></td>
        </tr>
      </tfoot>
    </table>
  `;
}

/* =========================
   BAZA (FIX EVENT ONCE)
========================= */
export function renderBaze(appState) {
  const el = document.getElementById("baza-lista");

  const entries = Object.values(appState.baza);

  el.innerHTML = `
    <table class="results-table">
      <tbody>
        ${entries
          .map(
            (p, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${esc(p.nazwa)}</td>
            <td class="center">${p.waga}</td>
            <td class="center">${p.ostatnioUzyta}</td>
            <td>
              <button class="del" data-id="${p.id}">🗑</button>
            </td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;

  if (!el.dataset.bound) {
    el.addEventListener("click", (e) => {
      const btn = e.target.closest(".del");
      if (!btn) return;

      delete appState.baza[btn.dataset.id];
      appState.saveToStorage();
      renderBaze(appState);
      toast("Usunięto");
    });

    el.dataset.bound = "1";
  }
}

/* =========================
   BADGE
========================= */
export function aktualizujBadge(appState) {
  document.getElementById("badgeNorm").textContent =
    appState.biezacaSesja.length;
  document.getElementById("badgeHistoria").textContent =
    appState.historia.length;
  document.getElementById("badgeBaza").textContent = Object.keys(
    appState.baza,
  ).length;
}
