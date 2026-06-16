// ===== NORMA OPTYMALNA MODULE =====
// Niezależna sekcja: użytkownik wkleja listę produktów (nazwa/kod + ilość),
// ręcznie podaje ceny i wagi, a algorytm 0/1 knapsack dobiera sztuki
// maksymalizujące łączną wagę w ramach budżetu i limitu wagi.

import { rozwiazKnapsack } from "./knapsack.js";
import { esc, toast } from "./utils.js";

// Stan modułu — wiersze wczytane z wklejonego tekstu.
// { nazwa, kod, ilosc, waga (podpowiedź z bazy lub null) }
let wiersze = [];

// ==========================
// PARSOWANIE LINII (nazwa/kod + ilość)
// ==========================
function parsujNormaLinie(line) {
  const t = line.trim();
  if (!t) return null;

  // Odetnij od końca czysto liczbowe kolumny/tokeny — to ilość i (opcjonalnie) cena.
  // Obsługuje rozdzielenie tabulatorem (kolumny Excela: ...\t12\t125,44)
  // oraz spacjami w jednej kolumnie ("12   125,44").
  const parts = t.split(/\t/);
  let numeryczne = [];
  while (parts.length > 1) {
    const tokeny = parts[parts.length - 1].trim().split(/\s+/).filter(Boolean);
    if (tokeny.length && tokeny.every((x) => /^[\d.,]+$/.test(x))) {
      numeryczne = tokeny.concat(numeryczne);
      parts.pop();
    } else break;
  }

  let iloscStr = null;
  let cenaStr = null;
  let reszta = parts.join("\t").trim();

  if (numeryczne.length) {
    iloscStr = numeryczne[0];
    if (numeryczne.length >= 2) cenaStr = numeryczne[numeryczne.length - 1];
  } else {
    // Brak tabulatora — ostatni token liczbowy to ilość.
    const slowa = t.split(/\s+/);
    const ostatnie = slowa[slowa.length - 1];
    if (/^[\d.,]+$/.test(ostatnie) && slowa.length > 1) {
      iloscStr = ostatnie;
      reszta = slowa.slice(0, -1).join(" ").trim();
    }
  }

  if (!iloscStr) return { blad: "Brak ilości", linia: t };
  const ilosc = parseFloat(iloscStr.replace(",", "."));
  if (isNaN(ilosc) || ilosc <= 0) return { blad: "Ilość ≤ 0", linia: t };

  // Waga z linii (ostatnie wystąpienie "X kg") — opcjonalna podpowiedź.
  let wagaZLinii = null;
  const wagaAll = [...reszta.matchAll(/(-?\d+[.,]?\d*)\s*kg\b/gi)];
  if (wagaAll.length) {
    const w = parseFloat(wagaAll[wagaAll.length - 1][1].replace(",", "."));
    if (!isNaN(w) && w > 0) wagaZLinii = w;
  }

  // Cena z linii (ostatnia wartość po ilości) — opcjonalna.
  let cenaZLinii = null;
  if (cenaStr) {
    const c = parseFloat(cenaStr.replace(",", "."));
    if (!isNaN(c) && c > 0) cenaZLinii = c;
  }

  // Usuń wagę "X kg" z nazwy (do wyświetlenia i wykrycia kodu).
  const nazwa = reszta.replace(/\s*-?\d+[.,]?\d*\s*kg\b/gi, "").trim() || reszta;

  return { nazwa, kod: wykryjKod(nazwa), ilosc, wagaZLinii, cenaZLinii, linia: t };
}

// Wykrywanie kodu produktu — analogicznie do parsera kalkulatora.
function wykryjKod(tekst) {
  const slowa = tekst.split(/\s+/);

  for (const raw of slowa) {
    const slowo = raw.replace(/[,.!?:;]+$/, "").trim();
    if (!slowo) continue;
    if (/^\d+(?:[.,]\d+)?(?:kg|g|l|ml|mm|cm|m|szt|pcs|bar|ele)$/i.test(slowo)) continue;
    if (/^\d+["']?$/i.test(slowo) && slowo.length <= 3) continue;
    if (/^[A-Za-z]{1,4}[-]?\d{2,}[A-Za-z]?$/.test(slowo)) return slowo;
    if (/^[A-Za-z]{1,5}-\d{2,}[A-Za-z]?$/.test(slowo)) return slowo;
  }

  for (let i = slowa.length - 1; i >= 0; i--) {
    const slowo = slowa[i].replace(/[,.!?:;]+$/, "").trim();
    if (!slowo) continue;
    if (/^\d+(?:[.,]\d+)?(?:kg|g|l|ml|mm|cm|m|szt|pcs|bar|ele)$/i.test(slowo)) continue;
    if (/^\d{4,}$/.test(slowo)) return slowo;
  }

  return "";
}

// ==========================
// WCZYTANIE PRODUKTÓW Z TEKSTU
// ==========================
export function wczytajProdukty(appState) {
  const text = document.getElementById("normaInput").value.trim();
  if (!text) {
    toast("Wklej listę produktów do pola tekstowego", true);
    return;
  }

  const bledy = [];
  wiersze = [];

  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const r = parsujNormaLinie(line);
    if (!r) continue;
    if (r.blad) {
      bledy.push(r);
      continue;
    }
    // Podpowiedź wagi: z wklejonej linii, w przeciwnym razie z bazy produktów (edytowalna).
    // Cena: z wklejonej linii, jeśli podana (edytowalna).
    const key = r.nazwa.toLowerCase().trim();
    const bazowy = appState.baza[key];
    wiersze.push({
      nazwa: r.nazwa,
      kod: r.kod,
      ilosc: r.ilosc,
      waga: r.wagaZLinii != null ? r.wagaZLinii : bazowy ? bazowy.waga : null,
      cena: r.cenaZLinii != null ? r.cenaZLinii : null,
    });
  }

  if (!wiersze.length) {
    toast("Brak rozpoznanych produktów", true);
    return;
  }

  renderWiersze();
  document.getElementById("norma-wiersze-wrap").style.display = "block";
  document.getElementById("norma-wynik-wrap").style.display = "none";

  const zCena = wiersze.filter((w) => w.cena != null).length;
  if (bledy.length) {
    toast(`Wczytano ${wiersze.length} produktów · pominięto ${bledy.length} błędnych linii`, true);
  } else if (zCena) {
    toast(`✓ Wczytano ${wiersze.length} produktów (${zCena} z ceną) — sprawdź i oblicz`);
  } else {
    toast(`✓ Wczytano ${wiersze.length} produktów — uzupełnij ceny i wagi`);
  }
}

// ==========================
// RENDER WIERSZY (edytowalne ceny i wagi)
// ==========================
function renderWiersze() {
  const rows = wiersze
    .map((w, i) => {
      const wagaVal = w.waga != null ? w.waga : "";
      const wagaHint = w.waga != null ? "Podpowiedź (z linii lub bazy) — możesz zmienić" : "Wpisz wagę";
      const cenaVal = w.cena != null ? w.cena : "";
      const cenaHint = w.cena != null ? "Cena z wklejonej linii — możesz zmienić" : "Wpisz cenę";
      return `<tr>
        <td class="mono" style="color:var(--text3);font-size:11px">${i + 1}</td>
        <td>${esc(w.nazwa)}</td>
        <td class="mono" style="color:var(--accent);font-weight:600">${esc(w.kod || "—")}</td>
        <td class="center mono"><strong>${w.ilosc}</strong></td>
        <td class="center">
          <input type="text" inputmode="decimal" class="norma-input${w.cena != null ? " prefilled" : ""}"
                 data-i="${i}" data-f="cena" value="${cenaVal}" placeholder="0,00" title="${cenaHint}" />
        </td>
        <td class="center">
          <input type="text" inputmode="decimal" class="norma-input${w.waga != null ? " prefilled" : ""}"
                 data-i="${i}" data-f="waga" value="${wagaVal}" placeholder="0,00" title="${wagaHint}" />
        </td>
      </tr>`;
    })
    .join("");

  document.getElementById("norma-wiersze").innerHTML = `
    <table class="results-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Nazwa produktu</th>
          <th class="mono">Kod</th>
          <th class="center">Ilość</th>
          <th class="center">Cena/szt. (zł)</th>
          <th class="center">Waga/szt. (kg)</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// Odczyt liczby z pola (obsługa przecinka).
function odczytaj(input) {
  const v = parseFloat((input.value || "").trim().replace(",", "."));
  return isNaN(v) ? null : v;
}

// ==========================
// OBLICZENIE NORMY OPTYMALNEJ
// ==========================
export function obliczNormeOptymalna(appState) {
  if (!wiersze.length) {
    toast("Najpierw wczytaj produkty", true);
    return;
  }

  const budzet = odczytaj(document.getElementById("normaBudzet"));
  const limitWagi = odczytaj(document.getElementById("normaLimitWagi"));

  if (budzet == null || budzet <= 0) {
    toast("Podaj budżet większy od 0", true);
    return;
  }
  if (limitWagi == null || limitWagi <= 0) {
    toast("Podaj limit wagi większy od 0", true);
    return;
  }

  // Wczytaj aktualne ceny i wagi z pól, zaktualizuj stan.
  const inputs = document.querySelectorAll("#norma-wiersze .norma-input");
  inputs.forEach((inp) => {
    const i = Number(inp.dataset.i);
    const val = odczytaj(inp);
    if (inp.dataset.f === "cena") wiersze[i].cena = val;
    else wiersze[i].waga = val;
  });

  const braki = wiersze.filter((w) => w.cena == null || w.cena <= 0 || w.waga == null || w.waga <= 0);
  if (braki.length) {
    toast(`Uzupełnij cenę i wagę dla wszystkich produktów (brakuje: ${braki.length})`, true);
    return;
  }

  // Rozbij ilości na pojedyncze sztuki — każda sztuka to osobny item.
  const items = [];
  wiersze.forEach((w, refIdx) => {
    const sztuki = Math.round(w.ilosc);
    for (let s = 0; s < sztuki; s++) {
      items.push({ koszt: w.cena, waga: w.waga, ref: refIdx });
    }
  });

  const wynik = rozwiazKnapsack(items, budzet, limitWagi);
  if (wynik.blad) {
    toast(wynik.blad, true);
    return;
  }

  renderWynik(items, wynik, budzet, limitWagi);
}

// ==========================
// RENDER WYNIKU + KARTY PODSUMOWANIA
// ==========================
function renderWynik(items, wynik, budzet, limitWagi) {
  const wrap = document.getElementById("norma-wynik-wrap");

  if (!wynik.wybrane.length) {
    document.getElementById("norma-wynik-tabela").innerHTML =
      '<div class="baza-empty"><div class="big">∅</div>Nie udało się dobrać żadnego produktu w ramach podanych limitów.</div>';
    document.getElementById("norma-karty").innerHTML = "";
    wrap.style.display = "block";
    return;
  }

  // Agregacja wybranych sztuk z powrotem do produktów.
  const agregat = new Map();
  wynik.wybrane.forEach((itemIdx) => {
    const ref = items[itemIdx].ref;
    const w = wiersze[ref];
    if (!agregat.has(ref)) {
      agregat.set(ref, { nazwa: w.nazwa, kod: w.kod, cena: w.cena, waga: w.waga, ilosc: 0 });
    }
    agregat.get(ref).ilosc += 1;
  });

  const lista = Array.from(agregat.values()).sort(
    (a, b) => b.waga * b.ilosc - a.waga * a.ilosc,
  );

  const rows = lista
    .map(
      (p, i) => `<tr>
        <td class="mono" style="color:var(--text3);font-size:11px">${i + 1}</td>
        <td>${esc(p.nazwa)}</td>
        <td class="mono" style="color:var(--accent);font-weight:600">${esc(p.kod || "—")}</td>
        <td class="center mono"><strong>${p.ilosc}</strong></td>
        <td class="right mono">${p.cena.toFixed(2)} zł</td>
        <td class="right mono">${p.waga.toFixed(2)} kg</td>
        <td class="right mono">${(p.cena * p.ilosc).toFixed(2)} zł</td>
        <td class="right mono"><strong>${(p.waga * p.ilosc).toFixed(2)} kg</strong></td>
      </tr>`,
    )
    .join("");

  const sztukRazem = lista.reduce((s, p) => s + p.ilosc, 0);

  document.getElementById("norma-wynik-tabela").innerHTML = `
    <table class="results-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Nazwa produktu</th>
          <th class="mono">Kod</th>
          <th class="center">Ilość</th>
          <th class="right">Cena/szt.</th>
          <th class="right">Waga/szt.</th>
          <th class="right">Razem zł</th>
          <th class="right">Razem kg</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="3" class="right">Razem:</td>
          <td class="center mono"><strong>${sztukRazem}</strong></td>
          <td></td>
          <td></td>
          <td class="right mono">${wynik.totalKoszt.toFixed(2)} zł</td>
          <td class="right mono">${wynik.totalWaga.toFixed(2)} kg</td>
        </tr>
      </tfoot>
    </table>`;

  // Karty podsumowania.
  const pozostalyBudzet = budzet - wynik.totalKoszt;
  const wolnaWaga = limitWagi - wynik.totalWaga;
  const procBudzet = budzet > 0 ? (wynik.totalKoszt / budzet) * 100 : 0;
  const procWaga = limitWagi > 0 ? (wynik.totalWaga / limitWagi) * 100 : 0;

  document.getElementById("norma-karty").innerHTML = `
    ${kartaHTML("Łączna waga", `${wynik.totalWaga.toFixed(2)} kg`, `wykorzystano ${procWaga.toFixed(1)}% limitu`, true)}
    ${kartaHTML("Łączny koszt", `${wynik.totalKoszt.toFixed(2)} zł`, `wykorzystano ${procBudzet.toFixed(1)}% budżetu`)}
    ${kartaHTML("Pozostały budżet", `${pozostalyBudzet.toFixed(2)} zł`, `z ${budzet.toFixed(2)} zł`)}
    ${kartaHTML("Wolna waga", `${wolnaWaga.toFixed(2)} kg`, `z ${limitWagi.toFixed(2)} kg`)}`;

  wrap.style.display = "block";
  wrap.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function kartaHTML(label, wartosc, sub, accent = false) {
  return `<div class="norma-karta${accent ? " accent" : ""}">
    <div class="norma-karta-label">${label}</div>
    <div class="norma-karta-val">${wartosc}</div>
    <div class="norma-karta-sub">${sub}</div>
  </div>`;
}

// ==========================
// WYCZYŚĆ
// ==========================
export function wyczyscNorme() {
  wiersze = [];
  document.getElementById("normaInput").value = "";
  document.getElementById("normaBudzet").value = "";
  document.getElementById("normaLimitWagi").value = "";
  document.getElementById("norma-wiersze").innerHTML = "";
  document.getElementById("norma-wiersze-wrap").style.display = "none";
  document.getElementById("norma-wynik-wrap").style.display = "none";
}
