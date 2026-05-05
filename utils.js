// ===== UTILS MODULE =====
export const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function toast(msg, err = false) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show" + (err ? " error" : "");
  clearTimeout(t._t);
  t._t = setTimeout(() => {
    t.className = "toast";
  }, 3200);
}

export function agregujProdukty(normy) {
  const mapa = {};
  for (const norma of normy) {
    for (const p of norma.produkty) {
      const key = p.nazwa.toLowerCase().trim();
      if (!mapa[key])
        mapa[key] = { nazwa: p.nazwa, kod: p.kod, waga: p.waga, iloscTotal: 0 };
      mapa[key].iloscTotal += p.iloscX;
    }
  }
  return Object.values(mapa).sort(
    (a, b) => b.waga * b.iloscTotal - a.waga * a.iloscTotal,
  );
}
