// ===== NORMA OPTYMALNA MODULE =====
// Niezależna sekcja: użytkownik wkleja listę produktów (nazwa/kod + ilość),
// ręcznie podaje ceny i wagi, a algorytm 0/1 knapsack dobiera sztuki
// maksymalizujące łączną wagę w ramach budżetu i limitu wagi.

import { rozwiazKnapsack } from "./knapsack.js";
import { aktualizujBadge, renderSesjaChips } from "./ui.js";
import { esc, toast } from "./utils.js";

// Stan modułu — wiersze wczytane z wklejonego tekstu.
// { nazwa, kod, ilosc, waga (podpowiedź z bazy lub null) }
let wiersze = [];

// Ostatni obliczony wynik (produkty gotowe do dodania do sesji) i referencja appState.
let ostatniWynik = null;
let aktualnyAppState = null;

const STORAGE_KEY = "wagaex_norma_stan";

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
  aktualnyAppState = appState;
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
  zapiszStan();
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
      const iloscVal = w.ilosc != null ? w.ilosc : "";
      return `<tr>
        <td class="mono" style="color:var(--text3);font-size:11px">${i + 1}</td>
        <td>${esc(w.nazwa)}</td>
        <td class="mono" style="color:var(--accent);font-weight:600">${esc(w.kod || "—")}</td>
        <td class="center">
          <input type="text" inputmode="decimal" class="norma-input" style="width:64px"
                 data-i="${i}" data-f="ilosc" value="${iloscVal}" placeholder="0" title="Dostępna ilość sztuk" />
        </td>
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

  // Nasłuchiwacze pól: aktualizacja stanu, czyszczenie podświetlenia błędu, Enter = oblicz.
  document.querySelectorAll("#norma-wiersze .norma-input").forEach((inp) => {
    inp.addEventListener("input", () => {
      const i = Number(inp.dataset.i);
      wiersze[i][inp.dataset.f] = odczytaj(inp);
      inp.classList.remove("error");
      zapiszStan();
    });
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        obliczNormeOptymalna(aktualnyAppState);
      }
    });
  });
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
  aktualnyAppState = appState;
  if (!wiersze.length) {
    toast("Najpierw wczytaj produkty", true);
    return;
  }

  const budzetEl = document.getElementById("normaBudzet");
  const limitEl = document.getElementById("normaLimitWagi");
  const budzet = odczytaj(budzetEl);
  const limitWagi = odczytaj(limitEl);

  budzetEl.classList.remove("error");
  limitEl.classList.remove("error");

  if (budzet == null || budzet <= 0) {
    toast("Podaj budżet większy od 0", true);
    budzetEl.classList.add("error");
    budzetEl.focus();
    return;
  }
  if (limitWagi == null || limitWagi <= 0) {
    toast("Podaj limit wagi większy od 0", true);
    limitEl.classList.add("error");
    limitEl.focus();
    return;
  }

  // Wczytaj aktualne ilości, ceny i wagi z pól, zaktualizuj stan.
  const inputs = document.querySelectorAll("#norma-wiersze .norma-input");
  inputs.forEach((inp) => {
    const i = Number(inp.dataset.i);
    wiersze[i][inp.dataset.f] = odczytaj(inp);
  });

  // Walidacja braków z podświetleniem konkretnych pól.
  let braki = 0;
  inputs.forEach((inp) => {
    const i = Number(inp.dataset.i);
    const v = wiersze[i][inp.dataset.f];
    const zly = v == null || v <= 0;
    inp.classList.toggle("error", zly);
    if (zly) braki++;
  });
  if (braki) {
    toast(`Uzupełnij podświetlone pola — ilość, cena i waga > 0 (brakuje: ${braki})`, true);
    return;
  }

  zapiszStan();

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
    ostatniWynik = null;
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
      agregat.set(ref, { ref, nazwa: w.nazwa, kod: w.kod, cena: w.cena, waga: w.waga, ilosc: 0 });
    }
    agregat.get(ref).ilosc += 1;
  });

  // Zachowaj kolejność z wklejonej listy (kolejność wierszy źródłowych).
  const lista = Array.from(agregat.values()).sort((a, b) => a.ref - b.ref);

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

  // Zapisz wynik w formacie gotowym do dodania do sesji.
  ostatniWynik = {
    produkty: lista.map((p) => ({
      nazwa: p.nazwa,
      kod: p.kod,
      waga: p.waga,
      ilosc: p.ilosc,
      iloscX: p.ilosc,
    })),
    totalKg: Number(wynik.totalWaga.toFixed(2)),
  };

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
    </table>
    <div class="norma-actions" style="margin-top:14px;display:flex;justify-content:flex-end">
      <button class="btn-primary" onclick="dodajNormeOptymalnaDoSesji()">+ Dodaj do sesji</button>
    </div>`;

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
// DODAJ DOBRANĄ NORMĘ DO SESJI
// ==========================
export function dodajNormeOptymalnaDoSesji(appState) {
  if (!ostatniWynik || !ostatniWynik.produkty.length) {
    toast("Najpierw oblicz normę optymalną", true);
    return;
  }

  if (appState.biezacaSesja.length + 1 > 8) {
    toast("Brak miejsca — sesja może mieć maks. 8 norm", true);
    return;
  }

  const nr = appState.biezacaSesja.length + 1;
  const produkty = ostatniWynik.produkty.map((p) => ({ ...p }));

  appState.biezacaSesja.push({
    id: crypto.randomUUID(),
    nr,
    label: `Norma ${nr}`,
    multiplier: 1,
    produkty,
    totalKg: ostatniWynik.totalKg,
  });

  // Aktualizuj bazę produktów (jak w kalkulatorze).
  appState.updateBaza(
    produkty.map((p) => ({ ...p })),
    new Date().toISOString(),
  );

  aktualizujBadge(appState);
  renderSesjaChips(appState);

  toast(
    `✓ Dodano normę do sesji (${ostatniWynik.totalKg.toFixed(2)} kg) — sprawdź w Kalkulatorze / Zbiorówce`,
  );
}

// ==========================
// ZAPIS / PRZYWRACANIE STANU (localStorage)
// ==========================
function zapiszStan() {
  try {
    const stan = {
      input: document.getElementById("normaInput")?.value || "",
      budzet: document.getElementById("normaBudzet")?.value || "",
      limit: document.getElementById("normaLimitWagi")?.value || "",
      wiersze,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stan));
  } catch {
    // brak miejsca / tryb prywatny — ignorujemy
  }
}

export function przywrocStanNormy(appState) {
  aktualnyAppState = appState;

  // Zapisuj budżet i limit przy każdej zmianie.
  const budzetEl = document.getElementById("normaBudzet");
  const limitEl = document.getElementById("normaLimitWagi");
  budzetEl?.addEventListener("input", zapiszStan);
  limitEl?.addEventListener("input", zapiszStan);

  let stan;
  try {
    stan = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    stan = null;
  }
  if (!stan) return;

  const inp = document.getElementById("normaInput");
  if (inp && stan.input) inp.value = stan.input;
  if (budzetEl && stan.budzet) budzetEl.value = stan.budzet;
  if (limitEl && stan.limit) limitEl.value = stan.limit;

  if (Array.isArray(stan.wiersze) && stan.wiersze.length) {
    wiersze = stan.wiersze;
    renderWiersze();
    document.getElementById("norma-wiersze-wrap").style.display = "block";
  }
}

// ==========================
// WYCZYŚĆ
// ==========================
export function wyczyscNorme() {
  wiersze = [];
  ostatniWynik = null;
  document.getElementById("normaInput").value = "";
  document.getElementById("normaBudzet").value = "";
  document.getElementById("normaLimitWagi").value = "";
  document.getElementById("norma-wiersze").innerHTML = "";
  document.getElementById("norma-wiersze-wrap").style.display = "none";
  document.getElementById("norma-wynik-wrap").style.display = "none";
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignorujemy
  }
}
