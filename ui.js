// ===== UI MODULE =====
import { esc, toast } from "./utils.js";

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
    .map(
      (n) => `
    <div class="norma-chip">
      <div class="norma-chip-left">
        <span class="norma-chip-nr">${n.label}</span>
        <span class="norma-chip-info">${n.produkty.length} produktów</span>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <span class="norma-chip-kg ${n.totalKg > 50 ? "warn" : ""}">${n.totalKg.toFixed(2)} kg${n.totalKg > 50 ? " ⚠️" : ""}</span>
        <button class="btn-ghost-sm" onclick="drukujNormeZSesji(${n.id})">🖨</button>
        <button class="btn-ghost-sm" onclick="usunNorme(${n.id})">✕</button>
      </div>
    </div>`,
    )
    .join("");

  const totalAll = appState.biezacaSesja.reduce((s, n) => s + n.totalKg, 0);
  document.getElementById("sesja-total-kg").innerHTML =
    `Łączna waga sesji: <strong>${totalAll.toFixed(2)} kg</strong>`;
}

export function usunNorme(appState, id) {
  appState.biezacaSesja = appState.biezacaSesja.filter((n) => n.id !== id);
  // Przenumeruj
  appState.biezacaSesja.forEach((n, i) => {
    n.nr = i + 1;
    n.label =
      n.multiplier > 1 ? `Norma ${i + 1} (×${n.multiplier})` : `Norma ${i + 1}`;
  });
  aktualizujBadge(appState);
  renderSesjaChips(appState);
}

export function resetSesji(appState) {
  if (!confirm("Wyczyścić bieżącą sesję (wszystkie normy)?")) return;
  appState.biezacaSesja = [];
  appState.aktualneWyniki = null;
  aktualizujBadge(appState);
  renderSesjaChips(appState);
  document.getElementById("wyniki-wrap").style.display = "none";
  document.getElementById("inputText").value = "";
  document.getElementById("multiplier").value = 1;
  aktualizujHint();
  toast("Sesja wyczyszczona");
}

export function renderZbiorcza(appState) {
  const el = document.getElementById("zbiorcza-content");
  if (!appState.biezacaSesja.length) {
    el.innerHTML =
      '<div class="baza-empty"><div class="big">∑</div>Dodaj co najmniej jedną normę w zakładce Kalkulator.</div>';
    return;
  }

  // Zsumuj produkty po nazwie (case-insensitive)
  const mapa = {};
  for (const norma of appState.biezacaSesja) {
    for (const p of norma.produkty) {
      const key = p.nazwa.toLowerCase().trim();
      if (!mapa[key])
        mapa[key] = { nazwa: p.nazwa, waga: p.waga, iloscTotal: 0 };
      mapa[key].iloscTotal += p.iloscX;
    }
  }

  const lista = Object.values(mapa).sort(
    (a, b) => b.waga * b.iloscTotal - a.waga * a.iloscTotal,
  );
  const totalKg = lista.reduce((s, p) => s + p.waga * p.iloscTotal, 0);

  let rows = lista
    .map(
      (p, i) => `
    <tr>
      <td class="mono" style="color:var(--text3);font-size:11px">${i + 1}</td>
      <td>${esc(p.nazwa)}</td>
      <td class="center mono"><strong>${p.iloscTotal}</strong></td>
      <td class="center mono">${p.waga} kg</td>
      <td class="right mono"><strong>${(p.waga * p.iloscTotal).toFixed(2)} kg</strong></td>
    </tr>`,
    )
    .join("");

  // Tagi norm
  const tags = appState.biezacaSesja
    .map(
      (n) =>
        `<span class="norma-tag">${n.label} · ${n.totalKg.toFixed(2)} kg</span>`,
    )
    .join("");

  el.innerHTML = `
    <div class="zbiorcza-normy-header">${tags}</div>
    <table class="results-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Nazwa produktu</th>
          <th class="center">Łączna ilość</th>
          <th class="center">Waga jedn.</th>
          <th class="right">Waga łączna</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="4" class="right">Łączna waga zbiorówki:</td>
          <td class="right">${totalKg.toFixed(2)} kg</td>
        </tr>
      </tfoot>
    </table>
    <div style="margin-top:10px;color:var(--text3);font-size:12px;text-align:right">
      ${appState.biezacaSesja.length} norm · ${lista.length} unikalnych produktów
    </div>`;
}

export function drukujNorme(appState) {
  if (!appState.aktualneWyniki) {
    toast("Najpierw oblicz normę", true);
    return;
  }
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

export function drukujListeProduktow(lista, tytul, data) {
  const posortowana = [...lista].sort(
    (a, b) => b.waga * b.iloscTotal - a.waga * a.iloscTotal,
  );
  const totalKg = posortowana.reduce((s, p) => s + p.waga * p.iloscTotal, 0);

  const S = {
    wrap: "font-family:Arial,sans-serif;font-size:12px;color:#000;",
    title: "font-size:13px;font-weight:bold;margin-bottom:8px;",
    table: "width:100%;border-collapse:collapse;font-size:12px;",
    thCheck:
      "border:1px solid #999;padding:6px 8px;text-align:center;width:24px;font-weight:bold;background:#fff;",
    thLp: "border:1px solid #999;padding:6px 8px;text-align:left;width:34px;font-weight:bold;background:#fff;",
    th: "border:1px solid #999;padding:6px 8px;text-align:left;font-weight:bold;background:#fff;",
    thC: "border:1px solid #999;padding:6px 8px;text-align:center;font-weight:bold;background:#fff;",
    thR: "border:1px solid #999;padding:6px 8px;text-align:right;font-weight:bold;background:#fff;",
    tdCheck:
      "border:1px solid #999;padding:6px 8px;text-align:center;width:24px;",
    tdLp: "border:1px solid #999;padding:6px 8px;text-align:right;width:34px;",
    td: "border:1px solid #999;padding:6px 8px;text-align:left;",
    tdC: "border:1px solid #999;padding:6px 8px;text-align:center;",
    tdR: "border:1px solid #999;padding:6px 8px;text-align:right;font-weight:bold;",
    tfTd: "border-top:2px solid #333;padding:6px 8px;text-align:right;font-weight:bold;border-left:none;border-right:none;border-bottom:none;",
    tfTdR:
      "border-top:2px solid #333;padding:6px 8px;text-align:right;font-weight:bold;",
  };

  const rows = posortowana
    .map(
      (p, i) => `
    <tr>
      <td style="${S.tdCheck}"><input type="checkbox" style="width:12px;height:12px;margin:0;"/></td>
      <td style="${S.tdLp}">${i + 1}.</td>
      <td style="${S.td}">${esc(p.nazwa)}</td>
      <td style="${S.tdC}">${p.iloscTotal}</td>
      <td style="${S.tdC}">${p.waga}</td>
      <td style="${S.tdR}">${(p.waga * p.iloscTotal).toFixed(2)}</td>
    </tr>`,
    )
    .join("");

  document.getElementById("printArea").innerHTML = `
    <div style="${S.wrap}">
      <div style="${S.title}">Zbiorcze podsumowanie produktów:</div>
      <table style="${S.table}">
        <thead>
          <tr>
            <th style="${S.thCheck}">✓</th>
            <th style="${S.thLp}">L.p.</th>
            <th style="${S.th}">Nazwa produktu</th>
            <th style="${S.thC}">Ilość</th>
            <th style="${S.thC}">Waga jednostkowa (kg)</th>
            <th style="${S.thR}">Waga łączna (kg)</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="5" style="${S.tfTd}">Łączna waga:</td>
            <td style="${S.tfTdR}">${totalKg.toFixed(2)} kg</td>
          </tr>
        </tfoot>
      </table>
    </div>`;
  window.print();
}

export function drukujZbiorcza(appState) {
  if (!appState.biezacaSesja.length) {
    toast("Brak norm w sesji", true);
    return;
  }

  const mapa = {};
  for (const norma of appState.biezacaSesja) {
    for (const p of norma.produkty) {
      const key = p.nazwa.toLowerCase().trim();
      if (!mapa[key])
        mapa[key] = { nazwa: p.nazwa, waga: p.waga, iloscTotal: 0 };
      mapa[key].iloscTotal += p.iloscX;
    }
  }
  const lista = Object.values(mapa).sort(
    (a, b) => b.waga * b.iloscTotal - a.waga * a.iloscTotal,
  );
  const totalKg = lista.reduce((s, p) => s + p.waga * p.iloscTotal, 0);
  const d = new Date().toLocaleString("pl-PL");

  const normaInfo = appState.biezacaSesja
    .map((n) => `${n.label}: ${n.totalKg.toFixed(2)} kg`)
    .join(" | ");

  const S = {
    wrap: "font-family:Arial,sans-serif;font-size:12px;color:#000;padding:10px;",
    title: "font-size:14px;font-weight:bold;margin-bottom:10px;",
    table: "width:100%;border-collapse:collapse;font-size:12px;margin-top:10px;",
    thCheck: "border:1px solid #999;padding:6px 8px;text-align:center;width:24px;font-weight:bold;background:#f0f0f0;",
    th: "border:1px solid #999;padding:6px 8px;text-align:left;font-weight:bold;background:#f0f0f0;",
    thC: "border:1px solid #999;padding:6px 8px;text-align:center;font-weight:bold;background:#f0f0f0;",
    thR: "border:1px solid #999;padding:6px 8px;text-align:right;font-weight:bold;background:#f0f0f0;",
    tdCheck: "border:1px solid #999;padding:6px 8px;text-align:center;width:24px;",
    td: "border:1px solid #999;padding:6px 8px;text-align:left;",
    tdC: "border:1px solid #999;padding:6px 8px;text-align:center;",
    tdR: "border:1px solid #999;padding:6px 8px;text-align:right;font-weight:bold;",
    tfTd: "border-top:2px solid #333;padding:6px 8px;text-align:right;font-weight:bold;border-left:none;border-right:none;border-bottom:none;",
    tfTdR: "border-top:2px solid #333;padding:6px 8px;text-align:right;font-weight:bold;",
  };

  const rows = lista
    .map(
      (p, i) => `
    <tr>
      <td style="${S.tdCheck}"><input type="checkbox" style="width:12px;height:12px;margin:0;border:1px solid #000;"/></td>
      <td style="${S.td}">${i + 1}</td>
      <td style="${S.td}">${esc(p.nazwa)}</td>
      <td style="${S.tdC}">${p.iloscTotal}</td>
      <td style="${S.tdC}">${p.waga}</td>
      <td style="${S.tdR}">${(p.waga * p.iloscTotal).toFixed(2)}</td>
    </tr>`,
    )
    .join("");

  document.getElementById("printArea").innerHTML = `
    <div style="${S.wrap}">
      <div style="${S.title}">Zbiorówka – ${appState.biezacaSesja.length} norm</div>
      <div style="margin-bottom:8px;">Data: ${d}</div>
      <table style="${S.table}">
        <thead>
          <tr>
            <th style="${S.thCheck}">✓</th>
            <th style="${S.th}">#</th>
            <th style="${S.th}">Nazwa produktu</th>
            <th style="${S.thC}">Łączna ilość</th>
            <th style="${S.thC}">Waga jedn. (kg)</th>
            <th style="${S.thR}">Waga łączna (kg)</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="5" style="${S.tfTd}">Łączna waga:</td>
            <td style="${S.tfTdR}">${totalKg.toFixed(2)} kg</td>
          </tr>
        </tfoot>
      </table>
    </div>`;
  window.print();
}

export function zapiszSesje(appState, storage) {
  if (!appState.biezacaSesja.length) {
    toast("Brak norm do zapisania", true);
    return;
  }

  const totalKg = parseFloat(
    appState.biezacaSesja.reduce((s, n) => s + n.totalKg, 0).toFixed(2),
  );

  const sesja = {
    id: Date.now(),
    nr: appState.historia.length + 1,
    data: new Date().toISOString(),
    normy: appState.biezacaSesja.map((n) => ({ ...n })),
    totalKg,
  };

  appState.addToHistoria(sesja);

  // Aktualizuj bazę produktów
  appState.updateBaza(
    appState.biezacaSesja.flatMap((n) =>
      n.produkty.map((p) => ({ ...p, ilosc: p.iloscX })),
    ),
    sesja.data,
  );
  storage.save("stat", storage.load("stat", 0) + 1);

  // Reset sesji po zapisaniu
  appState.biezacaSesja = [];
  appState.aktualneWyniki = null;
  aktualizujBadge(appState);
  renderSesjaChips(appState);
  document.getElementById("wyniki-wrap").style.display = "none";

  toast(`✓ Sesja #${sesja.nr} zapisana do historii`);
}

export function renderHistorie(appState) {
  const el = document.getElementById("historia-lista");
  if (!appState.historia.length) {
    el.innerHTML =
      '<div class="baza-empty"><div class="big">📋</div>Brak zapisanych sesji.</div>';
    return;
  }

  el.innerHTML = [...appState.historia]
    .reverse()
    .map((s) => {
      const d = new Date(s.data).toLocaleString("pl-PL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const normaCount = s.normy ? s.normy.length : "?";

      // Zbiorówka per sesja
      const mapa = {};
      if (s.normy) {
        for (const n of s.normy) {
          for (const p of n.produkty) {
            const key = p.nazwa.toLowerCase().trim();
            if (!mapa[key])
              mapa[key] = { nazwa: p.nazwa, waga: p.waga, iloscTotal: 0 };
            mapa[key].iloscTotal += p.iloscX;
          }
        }
      }
      const lista = Object.values(mapa).sort(
        (a, b) => b.waga * b.iloscTotal - a.waga * a.iloscTotal,
      );
      const rows = lista
        .map(
          (p, i) => `
      <tr>
        <td class="mono" style="color:var(--text3);font-size:11px">${i + 1}</td>
        <td>${esc(p.nazwa)}</td>
        <td class="center mono">${p.iloscTotal}</td>
        <td class="center mono">${p.waga} kg</td>
        <td class="right mono">${(p.waga * p.iloscTotal).toFixed(2)} kg</td>
      </tr>`,
        )
        .join("");

      return `<div class="sesja-card">
      <div class="sesja-header" onclick="toggleSesja(${s.id})">
        <div class="sesja-meta">
          <span class="sesja-nr">Sesja #${s.nr}</span>
          <span class="sesja-data">${d}</span>
          <span class="sesja-produkty">${normaCount} norm · ${lista.length} produktów</span>
        </div>
        <div style="display:flex;align-items:center;gap:14px">
          <span class="sesja-kg">${s.totalKg.toFixed(2)} kg</span>
          <span class="sesja-toggle" id="tog-${s.id}">›</span>
        </div>
      </div>
      <div class="sesja-body" id="body-${s.id}">
        <table class="results-table" style="margin-top:12px">
          <thead><tr><th>#</th><th>Nazwa</th><th class="center">Ilość łączna</th><th class="center">Waga jedn.</th><th class="right">Waga łączna</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><td colspan="4" class="right">Łączna waga:</td><td class="right">${s.totalKg.toFixed(2)} kg</td></tr></tfoot>
        </table>
        <div class="sesja-actions">
          <button class="btn-secondary" onclick="drukujHistoriaSesje(${s.id})">🖨 Drukuj zbiorówkę</button>
          <button class="btn-danger" onclick="usunSesje(${s.id})">🗑 Usuń</button>
        </div>
      </div>
    </div>`;
    })
    .join("");
}

export function toggleSesja(id) {
  document.getElementById("body-" + id).classList.toggle("open");
  document.getElementById("tog-" + id).classList.toggle("open");
}

export function usunSesje(appState, id) {
  appState.historia = appState.historia.filter((s) => s.id !== id);
  appState.saveToStorage();
  aktualizujBadge(appState);
  renderHistorie(appState);
  toast("Sesja usunięta");
}

export function wyczyscHistorie(appState) {
  if (!confirm("Usunąć całą historię sesji?")) return;
  appState.historia = [];
  appState.saveToStorage();
  aktualizujBadge(appState);
  renderHistorie(appState);
  toast("Historia wyczyszczona");
}

export function drukujHistoriaSesje(appState, id) {
  const s = appState.historia.find((x) => x.id === id);
  if (!s || !s.normy) return;

  const mapa = {};
  for (const n of s.normy) {
    for (const p of n.produkty) {
      const key = p.nazwa.toLowerCase().trim();
      if (!mapa[key])
        mapa[key] = { nazwa: p.nazwa, waga: p.waga, iloscTotal: 0 };
      mapa[key].iloscTotal += p.iloscX;
    }
  }
  const lista = Object.values(mapa).sort(
    (a, b) => b.waga * b.iloscTotal - a.waga * a.iloscTotal,
  );
  const totalKg = lista.reduce((ss, p) => ss + p.waga * p.iloscTotal, 0);
  const d = new Date(s.data).toLocaleString("pl-PL");
  const normaInfo = s.normy
    .map((n) => `${n.label}: ${n.totalKg.toFixed(2)} kg`)
    .join(" | ");

  const rows = lista
    .map(
      (p, i) => `
    <tr>
      <td>${i + 1}</td><td>${esc(p.nazwa)}</td>
      <td style="text-align:center">${p.iloscTotal}</td>
      <td style="text-align:center">${p.waga}</td>
      <td style="text-align:right">${(p.waga * p.iloscTotal).toFixed(2)}</td>
    </tr>`,
    )
    .join("");

  document.getElementById("printArea").innerHTML = `
    <h2>Zbiorówka – Sesja #${s.nr} (${s.normy.length} norm)</h2>
    <div class="print-date">Data: ${d}</div>
    <div class="print-normy">${normaInfo}</div>
    <table>
      <thead><tr><th>#</th><th>Nazwa produktu</th><th style="text-align:center">Łączna ilość</th><th style="text-align:center">Waga jedn. (kg)</th><th style="text-align:right">Waga łączna (kg)</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="4" style="text-align:right">Łączna waga:</td><td style="text-align:right">${totalKg.toFixed(2)} kg</td></tr></tfoot>
    </table>`;
  window.print();
}

export function renderBaze(appState) {
  const el = document.getElementById("baza-lista");
  const q = (document.getElementById("bazaSzukaj")?.value || "")
    .toLowerCase()
    .trim();
  let entries = Object.values(appState.baza);
  if (q) entries = entries.filter((p) => p.nazwa.toLowerCase().includes(q));
  entries.sort((a, b) => new Date(b.ostatnioUzyta) - new Date(a.ostatnioUzyta));

  if (!entries.length) {
    el.innerHTML = `<div class="baza-empty"><div class="big">◈</div>${q ? "Brak wyników." : "Baza jest pusta. Zapisz sesję."}</div>`;
    return;
  }

  const rows = entries
    .map((p, i) => {
      const d = new Date(p.ostatnioUzyta).toLocaleString("pl-PL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const key = p.nazwa.toLowerCase().trim();
      const safeKey = key.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      return `<tr>
      <td class="mono" style="color:var(--text3);font-size:11px">${i + 1}</td>
      <td>${esc(p.nazwa)}</td>
      <td class="center mono">${p.waga} kg</td>
      <td class="center" style="color:var(--text3);font-size:12px">${d}</td>
      <td class="center"><button class="btn-ghost-sm" onclick="usunZBazy('${safeKey}')">🗑</button></td>
    </tr>`;
    })
    .join("");

  el.innerHTML = `
    <table class="results-table">
      <thead>
        <tr><th>#</th><th>Nazwa produktu</th><th class="center">Waga jedn. (kg)</th><th class="center">Ostatnio używana</th><th class="center"></th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top:10px;color:var(--text3);font-size:12px;text-align:right">${entries.length} produktów w bazie</div>`;
}

export function usunZBazy(appState, key) {
  delete appState.baza[key];
  appState.saveToStorage();
  aktualizujBadge(appState);
  renderBaze(appState);
  toast("Produkt usunięty z bazy");
}

export function aktualizujBadge(appState) {
  const bc = Object.keys(appState.baza).length;
  document.getElementById("badgeNorm").textContent =
    appState.biezacaSesja.length;
  document.getElementById("badgeHistoria").textContent =
    appState.historia.length;
  document.getElementById("badgeBaza").textContent = bc;
  document.getElementById("statNormy").textContent =
    appState.biezacaSesja.length;
  document.getElementById("statBaza").textContent = bc;
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

export { aktualizujHint };
