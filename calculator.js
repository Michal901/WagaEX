// ===== CALCULATOR MODULE =====
import { aktualizujBadge, renderSesjaChips } from "./ui.js";
import { esc, toast } from "./utils.js";

export function parsujLinie(line) {
  const t = line.trim();
  if (!t) return null;

  // Ilość po tabulatorze
  const parts = t.split(/\t/);
  let iloscStr = null,
    reszta = t;
  if (parts.length >= 2) {
    iloscStr = parts[parts.length - 1].trim();
    reszta = parts.slice(0, -1).join("\t").trim();
  }

  // Waga: ostatnie wystąpienie LICZBA kg
  const wagaAll = [...reszta.matchAll(/(-?\d+[.,]?\d*)\s*kg/gi)];
  if (!wagaAll.length) return { blad: 'Brak wagi (brak "kg")', linia: t };
  const wm = wagaAll[wagaAll.length - 1];
  const waga = parseFloat(wm[1].replace(",", "."));

  // Ilość – jeśli nie z tabulatora, szukaj po wadze lub na końcu
  if (!iloscStr) {
    const after = reszta.slice(wm.index + wm[0].length).trim();
    if (after && /^[\d.,]+$/.test(after)) {
      iloscStr = after;
    }
  }
  if (!iloscStr) return { blad: "Brak ilości", linia: t };

  const ilosc = parseFloat(iloscStr.replace(",", "."));
  if (isNaN(waga) || waga <= 0) return { blad: "Waga ≤ 0", linia: t };
  if (isNaN(ilosc) || ilosc <= 0) return { blad: "Ilość ≤ 0", linia: t };

  // Nazwa: wszystko przed wagą w reszta
  const nazwa = reszta.slice(0, wm.index).trim() || reszta;
  return { nazwa, waga, ilosc, linia: t };
}

export function obliczWage(appState) {
  const text = document.getElementById("inputText").value.trim();
  if (!text) {
    toast("Wklej dane normy do pola tekstowego", true);
    return;
  }

  const mult = getMnoznik();
  let bledy = [],
    produkty = [];

  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const r = parsujLinie(line);
    if (!r) continue;
    if (r.blad) {
      bledy.push(r);
      continue;
    }
    produkty.push({ ...r, iloscX: r.ilosc * mult });
  }

  if (bledy.length) {
    let h =
      '<div class="bledne-info"><strong>❌ Błędy – popraw dane i spróbuj ponownie:</strong>';
    bledy.forEach((b) => {
      h += `<div class="bledna-linia">• ${esc(b.linia)} &rarr; ${b.blad}</div>`;
    });
    h += "</div>";
    document.getElementById("wyniki-tabela").innerHTML = h;
    document.getElementById("wyniki-suma").innerHTML = "";
    document.getElementById("wyniki-wrap").style.display = "block";
    appState.aktualneWyniki = null;
    return;
  }

  if (!produkty.length) {
    toast("Brak rozpoznanych produktów", true);
    return;
  }

  appState.aktualneWyniki = { produkty, mult, data: new Date().toISOString() };
  renderWyniki(produkty, mult);
  dodajDoSesji(appState);
}

export function renderWyniki(produkty, mult) {
  let t1 = 0,
    tN = 0,
    rows = "";

  produkty.forEach((p, i) => {
    const wX1 = p.waga * p.ilosc;
    const wXN = p.waga * p.iloscX;
    t1 += wX1;
    tN += wXN;

    const ilCell =
      mult > 1
        ? `<span style="color:var(--text3)">${p.ilosc}×${mult}=</span> <strong>${p.iloscX}</strong>`
        : `<strong>${p.ilosc}</strong>`;

    rows += `<tr>
      <td class="mono" style="color:var(--text3);font-size:11px">${i + 1}</td>
      <td>${esc(p.nazwa)}</td>
      <td class="center mono">${ilCell}</td>
      <td class="center mono">${p.waga} kg</td>
      <td class="right mono"><strong>${wXN.toFixed(2)} kg</strong></td>
    </tr>`;
  });

  document.getElementById("wyniki-tabela").innerHTML = `
    <table class="results-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Nazwa produktu</th>
          <th class="center">Ilość${mult > 1 ? " (×" + mult + ")" : ""}</th>
          <th class="center">Waga jedn.</th>
          <th class="right">Waga łączna</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="4" class="right">Suma normy${mult > 1 ? " ×" + mult : ""}:</td>
          <td class="right">${tN.toFixed(2)} kg</td>
        </tr>
      </tfoot>
    </table>`;

  const over50 = tN > 50;
  const sumaEl = document.getElementById("wyniki-suma");
  sumaEl.className = "suma-box" + (over50 ? " warn" : "");
  sumaEl.innerHTML =
    mult > 1
      ? `<span style="opacity:.7;font-size:12px">1 norma: ${t1.toFixed(2)} kg &nbsp;|&nbsp;</span>×${mult}: <strong>${tN.toFixed(2)} kg</strong>${over50 ? " ⚠️ >50kg" : ""}`
      : `Waga normy: <strong>${tN.toFixed(2)} kg</strong>${over50 ? " ⚠️ >50kg" : ""}`;

  document.getElementById("wyniki-wrap").style.display = "block";
}

export function dodajDoSesji(appState) {
  if (!appState.aktualneWyniki) {
    toast("Najpierw oblicz normę", true);
    return;
  }

  const { produkty, mult } = appState.aktualneWyniki;

  if (appState.biezacaSesja.length + mult > 8) {
    toast(
      `Za dużo norm – zostało miejsce na ${8 - appState.biezacaSesja.length}, a chcesz dodać ${mult}`,
      true,
    );
    return;
  }

  // Każda norma ma oryginalne ilości (bez mnożnika)
  const produktyJednej = produkty.map((p) => ({
    nazwa: p.nazwa,
    waga: p.waga,
    ilosc: p.ilosc,
    iloscX: p.ilosc,
  }));
  const totalKgJednej = parseFloat(
    produktyJednej.reduce((s, p) => s + p.waga * p.ilosc, 0).toFixed(2),
  );
  const now = new Date().toISOString();

  for (let i = 0; i < mult; i++) {
    const nr = appState.biezacaSesja.length + 1;
    appState.biezacaSesja.push({
      id: Date.now() + i,
      nr,
      label: `Norma ${nr}`,
      multiplier: 1,
      produkty: produktyJednej.map((p) => ({ ...p })),
      totalKg: totalKgJednej,
    });
  }

  // Aktualizuj bazę produktów
  appState.updateBaza(
    produktyJednej.map((p) => ({ ...p, ilosc: p.ilosc * mult })),
    now,
  );

  aktualizujBadge(appState);
  renderSesjaChips(appState);

  document.getElementById("inputText").value = "";
  document.getElementById("multiplier").value = 1;
  document.getElementById("wyniki-wrap").style.display = "none";
  appState.aktualneWyniki = null;
  aktualizujHint();

  const dodano = mult > 1 ? `${mult} normy` : `1 norma`;
  toast(
    `✓ Dodano ${dodano} po ${totalKgJednej.toFixed(2)} kg – wklej kolejną lub przejdź do zbiorówki`,
  );
}

// Funkcje pomocnicze dla kalkulatora
function getMnoznik() {
  return Math.max(
    1,
    parseInt(document.getElementById("multiplier").value) || 1,
  );
}

function zmienMnoznik(d) {
  const el = document.getElementById("multiplier");
  el.value = Math.max(1, Math.min(8, (parseInt(el.value) || 1) + d));
  aktualizujHint();
}

function aktualizujHint() {
  const v = parseInt(document.getElementById("multiplier").value) || 1;
  const hint = document.getElementById("mult-hint");
  hint.textContent =
    v === 1
      ? "Jedna norma (brak mnożenia ilości)"
      : `${v} identycznych norm — ilości ×${v}`;
  hint.style.color = v > 1 ? "var(--accent)" : "var(--text3)";
}

function wyczyscFormularz(appState) {
  document.getElementById("inputText").value = "";
  document.getElementById("multiplier").value = 1;
  document.getElementById("wyniki-wrap").style.display = "none";
  appState.aktualneWyniki = null;
  aktualizujHint();
}

export { aktualizujHint, getMnoznik, wyczyscFormularz, zmienMnoznik };
