// =====================================================
//  WagaEX – app.js
//  Flow: norma → oblicz → dodaj do sesji (max 8)
//        → zbiorówka (suma wszystkich norm) → drukuj
// =====================================================

// ===== STORAGE =====
const SK = { historia: 'wagaex_historia', baza: 'wagaex_baza', stat: 'wagaex_stat' };
const saveLS = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const loadLS = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };

// ===== STATE =====
let historia      = loadLS(SK.historia, []);
let baza          = loadLS(SK.baza, {});

// Bieżąca sesja – lista norm dodanych przez użytkownika
// Każda norma: { id, nr, label, multiplier, produkty: [{nazwa,waga,ilosc,iloscX}], totalKg }
let biezacaSesja  = [];

// Wyniki bieżącego obliczenia (jeszcze nie dodane do sesji)
let aktualneWyniki = null;

// ===== UTILS =====
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function toast(msg, err = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = 'toast show' + (err ? ' error' : '');
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.className = 'toast'; }, 3200);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {

  // Nawigacja
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.getElementById('tab-' + tab).classList.add('active');
      if (tab === 'zbiorcza')  renderZbiorcza();
      if (tab === 'historia')  renderHistorie();
      if (tab === 'baza')      renderBaze();
    });
  });

  // Liczba norm (mnożnik)
  document.getElementById('btnMinus').addEventListener('click', () => zmienMnoznik(-1));
  document.getElementById('btnPlus') .addEventListener('click', () => zmienMnoznik(1));
  document.getElementById('multiplier').addEventListener('input', aktualizujHint);
  aktualizujHint();

  // Kalkulator
  document.getElementById('btnOblicz')       .addEventListener('click', obliczWage);
  document.getElementById('btnWyczysc')      .addEventListener('click', wyczyscFormularz);
  document.getElementById('btnDodajDoSesji') .addEventListener('click', dodajDoSesji);
  document.getElementById('btnDrukujNorme')  .addEventListener('click', drukujNorme);
  document.getElementById('btnResetSesji')   .addEventListener('click', resetSesji);
  document.getElementById('btnIdZbiorówka')  .addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-tab="zbiorcza"]').classList.add('active');
    document.getElementById('tab-zbiorcza').classList.add('active');
    renderZbiorcza();
  });

  // Zbiorówka
  document.getElementById('btnDrukujZbiorcza').addEventListener('click', drukujZbiorcza);
  document.getElementById('btnZapiszSesje')   .addEventListener('click', zapiszSesje);

  // Historia
  document.getElementById('btnWyczyscHistorie').addEventListener('click', wyczyscHistorie);

  // Baza search
  document.getElementById('bazaSzukaj').addEventListener('input', renderBaze);

  aktualizujBadge();
});

// ===== LICZBA NORM =====
function zmienMnoznik(d) {
  const el = document.getElementById('multiplier');
  el.value = Math.max(1, Math.min(8, (parseInt(el.value) || 1) + d));
  aktualizujHint();
}
function aktualizujHint() {
  const v    = parseInt(document.getElementById('multiplier').value) || 1;
  const hint = document.getElementById('mult-hint');
  hint.textContent  = v === 1
    ? 'Jedna norma (brak mnożenia ilości)'
    : `${v} identycznych norm — ilości ×${v}`;
  hint.style.color  = v > 1 ? 'var(--accent)' : 'var(--text3)';
}
function getMnoznik() {
  return Math.max(1, parseInt(document.getElementById('multiplier').value) || 1);
}

// ===== PARSOWANIE LINII =====
function parsujLinie(line) {
  const t = line.trim();
  if (!t) return null;

  // Ilość po tabulatorze
  const parts = t.split(/\t/);
  let iloscStr = null, reszta = t;
  if (parts.length >= 2) {
    iloscStr = parts[parts.length - 1].trim();
    reszta   = parts.slice(0, -1).join('\t').trim();
  }

  // Waga: ostatnie wystąpienie LICZBA kg
  const wagaAll = [...reszta.matchAll(/(-?\d+[.,]?\d*)\s*kg/gi)];
  if (!wagaAll.length) return { blad: 'Brak wagi (brak "kg")', linia: t };
  const wm   = wagaAll[wagaAll.length - 1];
  const waga = parseFloat(wm[1].replace(',', '.'));

  // Ilość – jeśli nie z tabulatora, szukaj po wadze lub na końcu
  if (!iloscStr) {
    const after = reszta.slice(wm.index + wm[0].length).trim();
    if (after && /^[\d.,]+$/.test(after)) {
      iloscStr = after;
    }
  }
  if (!iloscStr) return { blad: 'Brak ilości', linia: t };

  const ilosc = parseFloat(iloscStr.replace(',', '.'));
  if (isNaN(waga) || waga <= 0) return { blad: 'Waga ≤ 0',  linia: t };
  if (isNaN(ilosc) || ilosc <= 0) return { blad: 'Ilość ≤ 0', linia: t };

  // Nazwa: wszystko przed wagą w reszta
  const nazwa = reszta.slice(0, wm.index).trim() || reszta;
  return { nazwa, waga, ilosc, linia: t };
}

// ===== OBLICZ WAGĘ =====
function obliczWage() {
  const text = document.getElementById('inputText').value.trim();
  if (!text) { toast('Wklej dane normy do pola tekstowego', true); return; }

  const mult = getMnoznik();
  let bledy = [], produkty = [];

  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const r = parsujLinie(line);
    if (!r) continue;
    if (r.blad) { bledy.push(r); continue; }
    produkty.push({ ...r, iloscX: r.ilosc * mult });
  }

  if (bledy.length) {
    let h = '<div class="bledne-info"><strong>❌ Błędy – popraw dane i spróbuj ponownie:</strong>';
    bledy.forEach(b => { h += `<div class="bledna-linia">• ${esc(b.linia)} &rarr; ${b.blad}</div>`; });
    h += '</div>';
    document.getElementById('wyniki-tabela').innerHTML = h;
    document.getElementById('wyniki-suma').innerHTML = '';
    document.getElementById('wyniki-wrap').style.display = 'block';
    aktualneWyniki = null;
    return;
  }

  if (!produkty.length) { toast('Brak rozpoznanych produktów', true); return; }

  aktualneWyniki = { produkty, mult, data: new Date().toISOString() };
  renderWyniki(produkty, mult);
  dodajDoSesji();
}

// ===== RENDER WYNIKI NORMY =====
function renderWyniki(produkty, mult) {
  let t1 = 0, tN = 0, rows = '';

  produkty.forEach((p, i) => {
    const wX1 = p.waga * p.ilosc;
    const wXN = p.waga * p.iloscX;
    t1 += wX1; tN += wXN;

    const ilCell = mult > 1
      ? `<span style="color:var(--text3)">${p.ilosc}×${mult}=</span> <strong>${p.iloscX}</strong>`
      : `<strong>${p.ilosc}</strong>`;

    rows += `<tr>
      <td class="mono" style="color:var(--text3);font-size:11px">${i+1}</td>
      <td>${esc(p.nazwa)}</td>
      <td class="center mono">${ilCell}</td>
      <td class="center mono">${p.waga} kg</td>
      <td class="right mono"><strong>${wXN.toFixed(2)} kg</strong></td>
    </tr>`;
  });

  document.getElementById('wyniki-tabela').innerHTML = `
    <table class="results-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Nazwa produktu</th>
          <th class="center">Ilość${mult > 1 ? ' (×' + mult + ')' : ''}</th>
          <th class="center">Waga jedn.</th>
          <th class="right">Waga łączna</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="4" class="right">Suma normy${mult > 1 ? ' ×' + mult : ''}:</td>
          <td class="right">${tN.toFixed(2)} kg</td>
        </tr>
      </tfoot>
    </table>`;

  const over50 = tN > 50;
  const sumaEl = document.getElementById('wyniki-suma');
  sumaEl.className = 'suma-box' + (over50 ? ' warn' : '');
  sumaEl.innerHTML = mult > 1
    ? `<span style="opacity:.7;font-size:12px">1 norma: ${t1.toFixed(2)} kg &nbsp;|&nbsp;</span>×${mult}: <strong>${tN.toFixed(2)} kg</strong>${over50 ? ' ⚠️ >50kg' : ''}`
    : `Waga normy: <strong>${tN.toFixed(2)} kg</strong>${over50 ? ' ⚠️ >50kg' : ''}`;

  document.getElementById('wyniki-wrap').style.display = 'block';
}

// ===== DODAJ DO SESJI =====
function dodajDoSesji() {
  if (!aktualneWyniki) { toast('Najpierw oblicz normę', true); return; }

  const { produkty, mult } = aktualneWyniki;

  if (biezacaSesja.length + mult > 8) {
    toast(`Za dużo norm – zostało miejsce na ${8 - biezacaSesja.length}, a chcesz dodać ${mult}`, true);
    return;
  }

  // Każda norma ma oryginalne ilości (bez mnożnika)
  const produktyJednej = produkty.map(p => ({
    nazwa: p.nazwa, waga: p.waga, ilosc: p.ilosc, iloscX: p.ilosc
  }));
  const totalKgJednej = parseFloat(produktyJednej.reduce((s, p) => s + p.waga * p.ilosc, 0).toFixed(2));
  const now = new Date().toISOString();

  for (let i = 0; i < mult; i++) {
    const nr = biezacaSesja.length + 1;
    biezacaSesja.push({
      id:         Date.now() + i,
      nr,
      label:      `Norma ${nr}`,
      multiplier: 1,
      produkty:   produktyJednej.map(p => ({ ...p })),
      totalKg:    totalKgJednej
    });
  }

  // Aktualizuj bazę produktów
  produktyJednej.forEach(p => {
    const key = p.nazwa.toLowerCase().trim();
    baza[key] = {
      nazwa: p.nazwa,
      waga: p.waga,
      ostatnioUzyta: now,
      lacznaIlosc: (baza[key]?.lacznaIlosc || 0) + p.ilosc * mult
    };
  });
  saveLS(SK.baza, baza);

  aktualizujBadge();
  renderSesjaChips();

  document.getElementById('inputText').value  = '';
  document.getElementById('multiplier').value = 1;
  document.getElementById('wyniki-wrap').style.display = 'none';
  aktualneWyniki = null;
  aktualizujHint();

  const dodano = mult > 1 ? `${mult} normy` : `1 norma`;
  toast(`✓ Dodano ${dodano} po ${totalKgJednej.toFixed(2)} kg – wklej kolejną lub przejdź do zbiorówki`);
}

// ===== RENDER CHIPS SESJI =====
function renderSesjaChips() {
  const pasek = document.getElementById('sesja-pasek');
  if (!biezacaSesja.length) { pasek.style.display = 'none'; return; }
  pasek.style.display = 'block';

  document.getElementById('sesja-licznik').textContent =
    `${biezacaSesja.length} / 8 norm`;

  const lista = document.getElementById('sesja-normy-lista');
  lista.innerHTML = biezacaSesja.map(n => `
    <div class="norma-chip">
      <div class="norma-chip-left">
        <span class="norma-chip-nr">${n.label}</span>
        <span class="norma-chip-info">${n.produkty.length} produktów</span>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <span class="norma-chip-kg ${n.totalKg > 50 ? 'warn' : ''}">${n.totalKg.toFixed(2)} kg${n.totalKg > 50 ? ' ⚠️' : ''}</span>
        <button class="btn-ghost-sm" onclick="drukujNormeZSesji(${n.id})">🖨</button>
        <button class="btn-ghost-sm" onclick="usunNorme(${n.id})">✕</button>
      </div>
    </div>`).join('');

  const totalAll = biezacaSesja.reduce((s, n) => s + n.totalKg, 0);
  document.getElementById('sesja-total-kg').innerHTML =
    `Łączna waga sesji: <strong>${totalAll.toFixed(2)} kg</strong>`;
}

// ===== USUŃ NORMĘ =====
function usunNorme(id) {
  biezacaSesja = biezacaSesja.filter(n => n.id !== id);
  // Przenumeruj
  biezacaSesja.forEach((n, i) => {
    n.nr    = i + 1;
    n.label = n.multiplier > 1 ? `Norma ${i+1} (×${n.multiplier})` : `Norma ${i+1}`;
  });
  aktualizujBadge();
  renderSesjaChips();
}

// ===== RESET SESJI =====
function resetSesji() {
  if (!confirm('Wyczyścić bieżącą sesję (wszystkie normy)?')) return;
  biezacaSesja  = [];
  aktualneWyniki = null;
  aktualizujBadge();
  renderSesjaChips();
  document.getElementById('wyniki-wrap').style.display = 'none';
  document.getElementById('inputText').value  = '';
  document.getElementById('multiplier').value = 1;
  aktualizujHint();
  toast('Sesja wyczyszczona');
}

// ===== ZBIORÓWKA =====
function renderZbiorcza() {
  const el = document.getElementById('zbiorcza-content');
  if (!biezacaSesja.length) {
    el.innerHTML = '<div class="baza-empty"><div class="big">∑</div>Dodaj co najmniej jedną normę w zakładce Kalkulator.</div>';
    return;
  }

  // Zsumuj produkty po nazwie (case-insensitive)
  const mapa = {};
  for (const norma of biezacaSesja) {
    for (const p of norma.produkty) {
      const key = p.nazwa.toLowerCase().trim();
      if (!mapa[key]) mapa[key] = { nazwa: p.nazwa, waga: p.waga, iloscTotal: 0 };
      mapa[key].iloscTotal += p.iloscX;
    }
  }

  const lista = Object.values(mapa).sort((a, b) => (b.waga * b.iloscTotal) - (a.waga * a.iloscTotal));
  const totalKg = lista.reduce((s, p) => s + p.waga * p.iloscTotal, 0);

  let rows = lista.map((p, i) => `
    <tr>
      <td class="mono" style="color:var(--text3);font-size:11px">${i+1}</td>
      <td>${esc(p.nazwa)}</td>
      <td class="center mono"><strong>${p.iloscTotal}</strong></td>
      <td class="center mono">${p.waga} kg</td>
      <td class="right mono"><strong>${(p.waga * p.iloscTotal).toFixed(2)} kg</strong></td>
    </tr>`).join('');

  // Tagi norm
  const tags = biezacaSesja.map(n =>
    `<span class="norma-tag">${n.label} · ${n.totalKg.toFixed(2)} kg</span>`).join('');

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
      ${biezacaSesja.length} norm · ${lista.length} unikalnych produktów
    </div>`;
}

// ===== DRUKUJ NORMĘ (bieżąca obliczona) =====
function drukujNorme() {
  if (!aktualneWyniki) { toast('Najpierw oblicz normę', true); return; }
  const { produkty, data } = aktualneWyniki;
  drukujListeProduktow(produkty.map(p => ({nazwa: p.nazwa, waga: p.waga, iloscTotal: p.ilosc})), 'Norma', new Date(data).toLocaleString('pl-PL'));
}

// ===== DRUKUJ NORMĘ Z SESJI (po id) =====
function drukujNormeZSesji(id) {
  const n = biezacaSesja.find(x => x.id === id);
  if (!n) return;
  drukujListeProduktow(n.produkty.map(p => ({nazwa: p.nazwa, waga: p.waga, iloscTotal: p.ilosc})), n.label, new Date().toLocaleString('pl-PL'));
}

// ===== WSPÓLNA FUNKCJA DRUKU TABELI =====
function drukujListeProduktow(lista, tytul, data) {
  const posortowana = [...lista].sort((a, b) => (b.waga * b.iloscTotal) - (a.waga * a.iloscTotal));
  const totalKg = posortowana.reduce((s, p) => s + p.waga * p.iloscTotal, 0);

  const S = {
    wrap:    'font-family:Arial,sans-serif;font-size:12px;color:#000;',
    title:   'font-size:13px;font-weight:bold;margin-bottom:8px;',
    table:   'width:100%;border-collapse:collapse;font-size:12px;',
    thCheck: 'border:1px solid #999;padding:6px 8px;text-align:center;width:24px;font-weight:bold;background:#fff;',
    thLp:    'border:1px solid #999;padding:6px 8px;text-align:left;width:34px;font-weight:bold;background:#fff;',
    th:      'border:1px solid #999;padding:6px 8px;text-align:left;font-weight:bold;background:#fff;',
    thC:     'border:1px solid #999;padding:6px 8px;text-align:center;font-weight:bold;background:#fff;',
    thR:     'border:1px solid #999;padding:6px 8px;text-align:right;font-weight:bold;background:#fff;',
    tdCheck: 'border:1px solid #999;padding:6px 8px;text-align:center;width:24px;',
    tdLp:    'border:1px solid #999;padding:6px 8px;text-align:right;width:34px;',
    td:      'border:1px solid #999;padding:6px 8px;text-align:left;',
    tdC:     'border:1px solid #999;padding:6px 8px;text-align:center;',
    tdR:     'border:1px solid #999;padding:6px 8px;text-align:right;font-weight:bold;',
    tfTd:    'border-top:2px solid #333;padding:6px 8px;text-align:right;font-weight:bold;border-left:none;border-right:none;border-bottom:none;',
    tfTdR:   'border-top:2px solid #333;padding:6px 8px;text-align:right;font-weight:bold;',
  };

  const rows = posortowana.map((p, i) => `
    <tr>
      <td style="${S.tdCheck}"><input type="checkbox" style="width:12px;height:12px;margin:0;"/></td>
      <td style="${S.tdLp}">${i+1}.</td>
      <td style="${S.td}">${esc(p.nazwa)}</td>
      <td style="${S.tdC}">${p.iloscTotal}</td>
      <td style="${S.tdC}">${p.waga}</td>
      <td style="${S.tdR}">${(p.waga * p.iloscTotal).toFixed(2)}</td>
    </tr>`).join('');

  document.getElementById('printArea').innerHTML = `
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

// ===== DRUKUJ ZBIORÓWKĘ =====
function drukujZbiorcza() {
  if (!biezacaSesja.length) { toast('Brak norm w sesji', true); return; }

  const mapa = {};
  for (const norma of biezacaSesja) {
    for (const p of norma.produkty) {
      const key = p.nazwa.toLowerCase().trim();
      if (!mapa[key]) mapa[key] = { nazwa: p.nazwa, waga: p.waga, iloscTotal: 0 };
      mapa[key].iloscTotal += p.iloscX;
    }
  }
  const lista   = Object.values(mapa).sort((a, b) => (b.waga * b.iloscTotal) - (a.waga * a.iloscTotal));
  const totalKg = lista.reduce((s, p) => s + p.waga * p.iloscTotal, 0);
  const d       = new Date().toLocaleString('pl-PL');

  const normaInfo = biezacaSesja.map(n => `${n.label}: ${n.totalKg.toFixed(2)} kg`).join(' | ');

  const rows = lista.map((p, i) => `
    <tr>
      <td>${i+1}</td>
      <td>${esc(p.nazwa)}</td>
      <td style="text-align:center">${p.iloscTotal}</td>
      <td style="text-align:center">${p.waga}</td>
      <td style="text-align:right">${(p.waga * p.iloscTotal).toFixed(2)}</td>
    </tr>`).join('');

  document.getElementById('printArea').innerHTML = `
    <h2>Zbiorówka – ${biezacaSesja.length} norm</h2>
    <div class="print-date">Data: ${d}</div>
    <div class="print-normy">${normaInfo}</div>

    <table>
      <thead><tr><th>#</th><th>Nazwa produktu</th><th style="text-align:center">Łączna ilość</th><th style="text-align:center">Waga jedn. (kg)</th><th style="text-align:right">Waga łączna (kg)</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="4" style="text-align:right">Łączna waga:</td><td style="text-align:right">${totalKg.toFixed(2)} kg</td></tr></tfoot>
    </table>`;
  window.print();
}

// ===== ZAPISZ SESJĘ DO HISTORII =====
function zapiszSesje() {
  if (!biezacaSesja.length) { toast('Brak norm do zapisania', true); return; }

  const totalKg = parseFloat(biezacaSesja.reduce((s, n) => s + n.totalKg, 0).toFixed(2));

  const sesja = {
    id:      Date.now(),
    nr:      historia.length + 1,
    data:    new Date().toISOString(),
    normy:   biezacaSesja.map(n => ({ ...n })),
    totalKg
  };

  historia.push(sesja);
  saveLS(SK.historia, historia);

  // Aktualizuj bazę produktów
  for (const norma of biezacaSesja) {
    for (const p of norma.produkty) {
      const key = p.nazwa.toLowerCase().trim();
      baza[key] = {
        nazwa:       p.nazwa,
        waga:        p.waga,
        ostatnioUzyta: sesja.data,
        lacznaIlosc: (baza[key]?.lacznaIlosc || 0) + p.iloscX
      };
    }
  }
  saveLS(SK.baza, baza);
  saveLS(SK.stat, (loadLS(SK.stat, 0) + 1));

  // Reset sesji po zapisaniu
  biezacaSesja  = [];
  aktualneWyniki = null;
  aktualizujBadge();
  renderSesjaChips();
  document.getElementById('wyniki-wrap').style.display = 'none';

  toast(`✓ Sesja #${sesja.nr} zapisana do historii`);
}

// ===== HISTORIA =====
function renderHistorie() {
  const el = document.getElementById('historia-lista');
  if (!historia.length) {
    el.innerHTML = '<div class="baza-empty"><div class="big">📋</div>Brak zapisanych sesji.</div>';
    return;
  }

  el.innerHTML = [...historia].reverse().map(s => {
    const d = new Date(s.data).toLocaleString('pl-PL', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
    const normaCount = s.normy ? s.normy.length : '?';

    // Zbiorówka per sesja
    const mapa = {};
    if (s.normy) {
      for (const n of s.normy) {
        for (const p of n.produkty) {
          const key = p.nazwa.toLowerCase().trim();
          if (!mapa[key]) mapa[key] = { nazwa: p.nazwa, waga: p.waga, iloscTotal: 0 };
          mapa[key].iloscTotal += p.iloscX;
        }
      }
    }
    const lista = Object.values(mapa).sort((a, b) => (b.waga * b.iloscTotal) - (a.waga * a.iloscTotal));
    const rows  = lista.map((p, i) => `
      <tr>
        <td class="mono" style="color:var(--text3);font-size:11px">${i+1}</td>
        <td>${esc(p.nazwa)}</td>
        <td class="center mono">${p.iloscTotal}</td>
        <td class="center mono">${p.waga} kg</td>
        <td class="right mono">${(p.waga * p.iloscTotal).toFixed(2)} kg</td>
      </tr>`).join('');

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
  }).join('');
}

function toggleSesja(id) {
  document.getElementById('body-' + id).classList.toggle('open');
  document.getElementById('tog-'  + id).classList.toggle('open');
}
function usunSesje(id) {
  historia = historia.filter(s => s.id !== id);
  saveLS(SK.historia, historia);
  aktualizujBadge();
  renderHistorie();
  toast('Sesja usunięta');
}
function wyczyscHistorie() {
  if (!confirm('Usunąć całą historię sesji?')) return;
  historia = [];
  saveLS(SK.historia, historia);
  aktualizujBadge();
  renderHistorie();
  toast('Historia wyczyszczona');
}
function drukujHistoriaSesje(id) {
  const s = historia.find(x => x.id === id);
  if (!s || !s.normy) return;

  const mapa = {};
  for (const n of s.normy) {
    for (const p of n.produkty) {
      const key = p.nazwa.toLowerCase().trim();
      if (!mapa[key]) mapa[key] = { nazwa: p.nazwa, waga: p.waga, iloscTotal: 0 };
      mapa[key].iloscTotal += p.iloscX;
    }
  }
  const lista   = Object.values(mapa).sort((a, b) => (b.waga * b.iloscTotal) - (a.waga * a.iloscTotal));
  const totalKg = lista.reduce((ss, p) => ss + p.waga * p.iloscTotal, 0);
  const d       = new Date(s.data).toLocaleString('pl-PL');
  const normaInfo = s.normy.map(n => `${n.label}: ${n.totalKg.toFixed(2)} kg`).join(' | ');

  const rows = lista.map((p, i) => `
    <tr>
      <td>${i+1}</td><td>${esc(p.nazwa)}</td>
      <td style="text-align:center">${p.iloscTotal}</td>
      <td style="text-align:center">${p.waga}</td>
      <td style="text-align:right">${(p.waga * p.iloscTotal).toFixed(2)}</td>
    </tr>`).join('');

  document.getElementById('printArea').innerHTML = `
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

// ===== BAZA =====
function renderBaze() {
  const el = document.getElementById('baza-lista');
  const q  = (document.getElementById('bazaSzukaj')?.value || '').toLowerCase().trim();
  let entries = Object.values(baza);
  if (q) entries = entries.filter(p => p.nazwa.toLowerCase().includes(q));
  entries.sort((a, b) => new Date(b.ostatnioUzyta) - new Date(a.ostatnioUzyta));

  if (!entries.length) {
    el.innerHTML = `<div class="baza-empty"><div class="big">◈</div>${q ? 'Brak wyników.' : 'Baza jest pusta. Zapisz sesję.'}</div>`;
    return;
  }

  const rows = entries.map((p, i) => {
    const d = new Date(p.ostatnioUzyta).toLocaleString('pl-PL', { day:'2-digit', month:'2-digit', year:'numeric' });
    return `<tr>
      <td class="mono" style="color:var(--text3);font-size:11px">${i+1}</td>
      <td>${esc(p.nazwa)}</td>
      <td class="center mono">${p.waga} kg</td>
      <td class="center mono">${p.lacznaIlosc}</td>
      <td class="center" style="color:var(--text3);font-size:12px">${d}</td>
    </tr>`;
  }).join('');

  el.innerHTML = `
    <table class="results-table">
      <thead>
        <tr><th>#</th><th>Nazwa produktu</th><th class="center">Waga jedn. (kg)</th><th class="center">Łączna ilość</th><th class="center">Ostatnio używana</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top:10px;color:var(--text3);font-size:12px;text-align:right">${entries.length} produktów w bazie</div>`;
}

// ===== BADGE / STATS =====
// ===== WYCZYŚĆ FORMULARZ =====
function wyczyscFormularz() {
  document.getElementById('inputText').value = '';
  document.getElementById('multiplier').value = 1;
  document.getElementById('wyniki-wrap').style.display = 'none';
  aktualneWyniki = null;
  aktualizujHint();
}

function aktualizujBadge() {
  const bc = Object.keys(baza).length;
  document.getElementById('badgeNorm')    .textContent = biezacaSesja.length;
  document.getElementById('badgeHistoria').textContent = historia.length;
  document.getElementById('badgeBaza')    .textContent = bc;
  document.getElementById('statNormy')    .textContent = biezacaSesja.length;
  document.getElementById('statBaza')     .textContent = bc;
}
