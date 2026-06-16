// ===== KNAPSACK MODULE =====
// 0/1 knapsack z dyskretyzacją budżetu (krok 0.01 zł = 1 grosz).
// Maksymalizuje łączną wagę dobranych sztuk przy dwóch ograniczeniach:
//   1. łączny koszt ≤ budżet
//   2. łączna waga  ≤ limit wagi
// Każda sztuka (jednostka) to osobny item — ilości są wcześniej rozbite.

const GROSZE = 100; // 1 zł = 100 groszy (krok dyskretyzacji)
const EPS = 1e-9;

// Limit pamięci dla macierzy decyzji (groszowy budżet × liczba sztuk).
// Chroni przed zawieszeniem przeglądarki przy ekstremalnych danych.
const MAX_KOMOREK = 120_000_000;

/**
 * @param {Array<{koszt:number, waga:number, ref:number}>} items
 *   koszt – cena jednej sztuki (zł), waga – waga jednej sztuki (kg),
 *   ref   – indeks produktu źródłowego (do agregacji wyniku).
 * @param {number} budzet     – budżet w złotych.
 * @param {number} limitWagi  – limit łącznej wagi w kilogramach.
 * @returns {{ wybrane:number[], totalWaga:number, totalKoszt:number }
 *           | { blad:string }}
 *   wybrane – indeksy items wchodzących do rozwiązania.
 */
export function rozwiazKnapsack(items, budzet, limitWagi) {
  const budzetGr = Math.round(budzet * GROSZE);

  if (!items.length || budzetGr <= 0 || limitWagi <= 0) {
    return { wybrane: [], totalWaga: 0, totalKoszt: 0 };
  }

  // Pomijamy sztuki, których nie da się kupić (za drogie lub za ciężkie same z siebie).
  const aktywne = [];
  for (let i = 0; i < items.length; i++) {
    const kosztGr = Math.round(items[i].koszt * GROSZE);
    if (kosztGr > 0 && kosztGr <= budzetGr && items[i].waga <= limitWagi + EPS) {
      aktywne.push({ idx: i, kosztGr, waga: items[i].waga });
    }
  }

  if (!aktywne.length) {
    return { wybrane: [], totalWaga: 0, totalKoszt: 0 };
  }

  if ((budzetGr + 1) * aktywne.length > MAX_KOMOREK) {
    return {
      blad:
        "Zbyt duży zakres obliczeń (budżet × liczba sztuk). Zmniejsz budżet lub liczbę produktów.",
    };
  }

  // dp[c] = maksymalna łączna waga (≤ limitWagi) osiągalna kosztem ≤ c groszy.
  const dp = new Float64Array(budzetGr + 1);
  // keep[i][c] = 1, jeśli i-ta sztuka poprawiła dp[c] w swoim przebiegu.
  const keep = [];

  for (let i = 0; i < aktywne.length; i++) {
    const { kosztGr, waga } = aktywne[i];
    const row = new Uint8Array(budzetGr + 1);
    for (let c = budzetGr; c >= kosztGr; c--) {
      const kandydat = dp[c - kosztGr] + waga;
      if (kandydat <= limitWagi + EPS && kandydat > dp[c] + EPS) {
        dp[c] = kandydat;
        row[c] = 1;
      }
    }
    keep.push(row);
  }

  // Odtworzenie rozwiązania — backtracking od pełnego budżetu.
  const wybrane = [];
  let c = budzetGr;
  let totalWaga = 0;
  let totalKosztGr = 0;
  for (let i = aktywne.length - 1; i >= 0; i--) {
    if (keep[i][c]) {
      wybrane.push(aktywne[i].idx);
      totalWaga += aktywne[i].waga;
      totalKosztGr += aktywne[i].kosztGr;
      c -= aktywne[i].kosztGr;
    }
  }

  return {
    wybrane,
    totalWaga: Number(totalWaga.toFixed(3)),
    totalKoszt: totalKosztGr / GROSZE,
  };
}
