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

  // Kod produktu: szukaj wzorców kodów w tekście przed wagą
  const przedWaga = reszta.slice(0, wm.index).trim();
  let kod = "";
  let nazwa = przedWaga;
  
  // Wzorce kodów produktów:
  // 1. Litery+cyfry (min 2 znaki alfanum łącznie, np. G66119, EGW102, PH-201, M57692A)
  // 2. Czysto numeryczne kody z min 4 cyframi (np. 23190, 22621)
  // Szukamy od początku — kody często są na początku lub na końcu nazwy
  
  const slowa = przedWaga.split(/\s+/);
  
  // Najpierw szukaj kodów alfanumerycznych (litery+cyfry mieszane, opcjonalnie z myślnikiem)
  // np. G66119, EGW102, PH-201, M57692A, S8800, M8095002
  for (let i = 0; i < slowa.length; i++) {
    const slowo = slowa[i].replace(/[,.!?:;]+$/, "").trim();
    if (!slowo) continue;
    
    // Ignoruj jednostki fizyczne i wymiary
    if (/^\d+(?:[.,]\d+)?(?:kg|g|l|ml|mm|cm|m|szt|pcs|bar|ele)$/i.test(slowo)) continue;
    if (/^\d+["']?$/i.test(slowo) && slowo.length <= 3) continue; // krótkie liczby jak wymiary
    
    // Kod alfanumeryczny: zaczyna się od liter, potem cyfry (opcjonalnie litera na końcu)
    // np. G66119, EGW102, PH-201, M57692A, S8800
    if (/^[A-Za-z]{1,4}[-]?\d{2,}[A-Za-z]?$/.test(slowo)) {
      kod = slowo;
      break;
    }
    
    // Kod z myślnikiem: litery-cyfry lub cyfry-litery
    // np. PH-201
    if (/^[A-Za-z]{1,5}-\d{2,}[A-Za-z]?$/.test(slowo)) {
      kod = slowo;
      break;
    }
  }
  
  // Jeśli nie znaleziono kodu alfanumerycznego, szukaj czysto numerycznego (min 4 cyfry)
  // Szukaj od końca — numeryczne kody są zwykle na końcu nazwy (np. "Trizand 23190")
  if (!kod) {
    for (let i = slowa.length - 1; i >= 0; i--) {
      const slowo = slowa[i].replace(/[,.!?:;]+$/, "").trim();
      if (!slowo) continue;
      
      // Ignoruj jednostki
      if (/^\d+(?:[.,]\d+)?(?:kg|g|l|ml|mm|cm|m|szt|pcs|bar|ele)$/i.test(slowo)) continue;
      
      // Czysto numeryczny kod: min 4 cyfry
      if (/^\d{4,}$/.test(slowo)) {
        kod = slowo;
        break;
      }
    }
  }

  return { nazwa, kod, waga, ilosc, linia: t };
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
      <td class="mono" style="color:var(--accent);font-weight:600">${esc(p.kod || "—")}</td>
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
          <th class="mono">Kod</th>
          <th>Nazwa produktu</th>
          <th class="center">Ilość${mult > 1 ? " (×" + mult + ")" : ""}</th>
          <th class="center">Waga jedn.</th>
          <th class="right">Waga łączna</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="5" class="right">Suma normy${mult > 1 ? " ×" + mult : ""}:</td>
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
    kod: p.kod,
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
      id: crypto.randomUUID(),
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

// Generuj format wejściowy na podstawie obliczonych wyników
export function generujFormatWejsciowy(appState) {
  if (!appState.aktualneWyniki) {
    return null;
  }

  const { produkty, mult } = appState.aktualneWyniki;
  
  // Jeśli mult > 1, użyj zmultiplikowanych ilości (iloscX)
  // Jeśli mult = 1, użyj oryginalnych ilości
  const lines = produkty.map((p) => {
    const iloscDoKopii = mult > 1 ? p.iloscX : p.ilosc;
    // Format: nazwa waga kg ilość
    const iloscFormatted = Number.isInteger(iloscDoKopii) 
      ? iloscDoKopii 
      : iloscDoKopii.toFixed(2).replace(/\.?0+$/, '');
    return `${p.nazwa} ${p.waga}kg	${iloscFormatted}`;
  });
  
  return lines.join('\n');
}

// Kopiuj normę do schowka
export function kopijNorme(appState) {
  const tekst = generujFormatWejsciowy(appState);
  
  if (!tekst) {
    toast("Najpierw oblicz normę", true);
    return;
  }
  
  navigator.clipboard.writeText(tekst).then(() => {
    toast("✓ Norma skopiowana do schowka");
  }).catch(() => {
    // Fallback dla starszych przeglądarek
    const textarea = document.createElement('textarea');
    textarea.value = tekst;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    toast("✓ Norma skopiowana do schowka");
  });
}

// Kopiuj normę z sesji do schowka
export function kopijNormeZSesji(appState, id) {
  const norma = appState.biezacaSesja.find((n) => n.id === id);
  if (!norma) {
    toast("Norma nie znaleziona", true);
    return;
  }

  // Generuj format: nazwa kod waga kg ilość
  const lines = norma.produkty.map((p) => {
    const iloscFormatted = Number.isInteger(p.ilosc)
      ? p.ilosc
      : p.ilosc.toFixed(2).replace(/\.?0+$/, '');
    // Jeśli jest kod, umieść go na końcu nazwy
    const nazwaZKodem = p.kod ? `${p.nazwa} ${p.kod}` : p.nazwa;
    return `${nazwaZKodem} ${p.waga}kg	${iloscFormatted}`;
  });
  
  const tekst = lines.join('\n');

  navigator.clipboard.writeText(tekst).then(() => {
    toast("✓ Norma skopiowana do schowka");
  }).catch(() => {
    // Fallback dla starszych przeglądarek
    const textarea = document.createElement('textarea');
    textarea.value = tekst;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    toast("✓ Norma skopiowana do schowka");
  });
}

export { aktualizujHint, getMnoznik, wyczyscFormularz, zmienMnoznik };
