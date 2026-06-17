// =====================================================
//  WagaEX – main.js (POPRAWIONY FLOW SUPABASE)
// =====================================================

import {
  aktualizujHint,
  dodajDoSesji,
  eksportujDoAHK,
  eksportujHistoriaDoAHK,
  kopijNormeZSesji,
  obliczWage,
  wyczyscFormularz,
  zmienMnoznik,
} from "./src/js/calculator.js";

import { AppState } from "./src/js/state.js";
import { StorageManager } from "./src/js/storage.js";
import { toast } from "./src/js/utils.js";

import {
  dodajNormeOptymalnaDoSesji,
  obliczNormeOptymalna,
  przywrocStanNormy,
  wczytajProdukty,
  wyczyscNorme,
} from "./src/js/norma.js";

import {
  aktualizujBadge,
  dodajProduktReczny,
  drukujHistoriaSesje,
  drukujNorme,
  drukujNormeZSesji,
  drukujZbiorcza,
  kopijHistoriaNorme,
  kopijHistoriaSesje,
  renderBaze,
  renderHistorie,
  renderZbiorcza,
  resetSesji,
  toggleNorma,
  togglePodsekcja,
  toggleSesja,
  usunNorme,
  usunSesje,
  usunZBazy,
  wyczyscHistorie,
  zapiszSesje,
} from "./src/js/ui.js";

// ==========================
// INIT INSTANCES
// ==========================
const storage = new StorageManager();
const appState = new AppState(storage);

// ==========================
// GLOBAL FUNCTIONS (HTML)
// ==========================
window.drukujNormeZSesji = (id) => drukujNormeZSesji(appState, id);
window.kopijNormeZSesji = (id) => kopijNormeZSesji(appState, id);
window.usunNorme = (id) => usunNorme(appState, id);
window.toggleNorma = toggleNorma;
window.toggleSesja = toggleSesja;
window.togglePodsekcja = togglePodsekcja;
window.usunSesje = (id) => usunSesje(appState, id);
window.drukujHistoriaSesje = (id) => drukujHistoriaSesje(appState, id);
window.eksportujHistoriaDoAHK = (id) => eksportujHistoriaDoAHK(appState, id);
window.dodajNormeOptymalnaDoSesji = () => dodajNormeOptymalnaDoSesji(appState);
window.kopijHistoriaSesje = (id) => kopijHistoriaSesje(appState, id);
window.kopijHistoriaNorme = (sesjaId, normaId) => kopijHistoriaNorme(appState, sesjaId, normaId);
window.usunZBazy = (key) => usunZBazy(appState, key);

// Aktualizacja wagi z ostrzeżeń
window.aktualizujWageBazy = async (key, nowaWaga) => {
  if (appState.baza[key]) {
    appState.baza[key].waga = nowaWaga;
    appState.baza[key].ostatnioUzyta = new Date().toISOString();
    await appState.saveToStorage();
    // Ukryj ostrzeżenia
    const warnBox = document.querySelector(".waga-warn-box");
    if (warnBox) warnBox.remove();
    document.querySelectorAll(".row-warn").forEach((r) => r.classList.remove("row-warn"));
    document.querySelectorAll(".waga-warn").forEach((s) => s.remove());
    toast(`✓ Waga zaktualizowana: ${nowaWaga} kg`);
  }
};

window.aktualizujWszystkieWagi = async (encodedData) => {
  const updates = JSON.parse(decodeURIComponent(encodedData));
  for (const u of updates) {
    if (appState.baza[u.key]) {
      appState.baza[u.key].waga = u.waga;
      appState.baza[u.key].ostatnioUzyta = new Date().toISOString();
    }
  }
  await appState.saveToStorage();
  // Ukryj ostrzeżenia
  const warnBox = document.querySelector(".waga-warn-box");
  if (warnBox) warnBox.remove();
  document.querySelectorAll(".row-warn").forEach((r) => r.classList.remove("row-warn"));
  document.querySelectorAll(".waga-warn").forEach((s) => s.remove());
  toast(`✓ Zaktualizowano wagi ${updates.length} produktów`);
};

// ==========================
// INIT APP (🔥 FIX HERE)
// ==========================
async function init() {
  // 🔥 KLUCZ: czekamy na Supabase i historię
  await appState.init();

  // ==========================
  // HAMBURGER MENU (slide from left)
  // ==========================
  const hamburger = document.getElementById("btnHamburger");
  const sidebar = document.querySelector(".sidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");

  function toggleSidebar() {
    hamburger.classList.toggle("open");
    sidebar.classList.toggle("open");
    sidebarOverlay.classList.toggle("open");
  }

  function closeSidebar() {
    hamburger.classList.remove("open");
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("open");
  }

  hamburger.addEventListener("click", toggleSidebar);
  sidebarOverlay.addEventListener("click", closeSidebar);

  // Zamknij sidebar po kliknięciu w zakładkę (mobile)
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", closeSidebar);
  });

  // ==========================
  // LOGO SPARKS ANIMATION (canvas)
  // ==========================
  const logoCanvas = document.getElementById("logoSparksCanvas");
  if (logoCanvas) {
    const ctx = logoCanvas.getContext("2d");
    let W, H;
    const sparks = [];

    function resizeLogoCanvas() {
      W = logoCanvas.width = logoCanvas.offsetWidth;
      H = logoCanvas.height = logoCanvas.offsetHeight;
    }
    resizeLogoCanvas();
    window.addEventListener("resize", resizeLogoCanvas);

    function LogoSpark() {
      this.reset = function () {
        this.x = Math.random() * W;
        this.y = Math.random() * H;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = Math.random() * 0.8 + 0.2;
        this.life = 1;
        this.decay = Math.random() * 0.012 + 0.005;
        this.size = Math.random() * 1.8 + 0.4;
      };
      this.reset();
      this.life = Math.random();
    }

    for (let i = 0; i < 30; i++) sparks.push(new LogoSpark());

    function animateLogoSparks() {
      ctx.clearRect(0, 0, W, H);
      const accentColor = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#00d4a0";
      sparks.forEach(function (p) {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0 || p.y > H) p.reset();
        ctx.globalAlpha = p.life * 0.4;
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      requestAnimationFrame(animateLogoSparks);
    }
    animateLogoSparks();
  }

  // ==========================
  // ANIMOWANE TŁO (constellation) + przełącznik
  // ==========================
  bgAktywna = (localStorage.getItem("wagaex_anim") || "on") !== "off";
  const animCheckbox = document.getElementById("btnAnim");
  if (animCheckbox) {
    animCheckbox.checked = bgAktywna;

    let punktAnim = null;
    const animLabel = animCheckbox.closest(".theme-switch");
    animLabel?.addEventListener("pointerdown", (e) => {
      punktAnim = { x: e.clientX, y: e.clientY };
    });

    animCheckbox.addEventListener("change", () => {
      setBgAnimacja(animCheckbox.checked);
      punktAnim = null;
    });
  }
  initBackgroundFX();

  // ==========================
  // NAVIGATION
  // ==========================
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

  // ==========================
  // MULTIPLIER
  // ==========================
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

  // ==========================
  // CALCULATOR
  // ==========================
  document
    .getElementById("btnOblicz")
    .addEventListener("click", () => obliczWage(appState));

  document
    .getElementById("btnWyczysc")
    .addEventListener("click", () => wyczyscFormularz(appState));

  document
    .getElementById("btnDodajDoSesji")
    .addEventListener("click", () => dodajDoSesji(appState));

  document
    .getElementById("btnDrukujNorme")
    .addEventListener("click", () => drukujNorme(appState));

  document
    .getElementById("btnResetSesji")
    .addEventListener("click", () => resetSesji(appState));

  document
    .getElementById("btnEksportujAHK")
    .addEventListener("click", () => eksportujDoAHK(appState));

  document.getElementById("btnIdZbiorówka").addEventListener("click", () => {
    document
      .querySelectorAll(".nav-btn")
      .forEach((b) => b.classList.remove("active"));

    document
      .querySelectorAll(".tab-content")
      .forEach((t) => t.classList.remove("active"));

    document.querySelector('[data-tab="zbiorcza"]').classList.add("active");
    document.getElementById("tab-zbiorcza").classList.add("active");

    renderZbiorcza(appState);
  });

  // ==========================
  // ZBIORÓWKA
  // ==========================
  document
    .getElementById("btnDrukujZbiorcza")
    .addEventListener("click", () => drukujZbiorcza(appState));

  document
    .getElementById("btnZapiszSesje")
    .addEventListener("click", () => zapiszSesje(appState));

  // ==========================
  // HISTORIA
  // ==========================
  document
    .getElementById("btnWyczyscHistorie")
    .addEventListener("click", () => wyczyscHistorie(appState));

  document
    .getElementById("historiaSzukaj")
    .addEventListener("input", () => renderHistorie(appState));

  // ==========================
  // BAZA SEARCH + ADD
  // ==========================
  document
    .getElementById("bazaSzukaj")
    .addEventListener("input", () => renderBaze(appState));

  document
    .getElementById("btnDodajProdukt")
    .addEventListener("click", () => dodajProduktReczny(appState));

  // ==========================
  // NORMA OPTYMALNA
  // ==========================
  document
    .getElementById("btnNormaWczytaj")
    .addEventListener("click", () => wczytajProdukty(appState));

  document
    .getElementById("btnNormaOblicz")
    .addEventListener("click", () => obliczNormeOptymalna(appState));

  document
    .getElementById("btnNormaWyczysc")
    .addEventListener("click", () => wyczyscNorme());

  // Przywróć ostatni stan zakładki Norma optymalna (localStorage)
  przywrocStanNormy(appState);

  // ==========================
  // THEME TOGGLE
  // ==========================
  const savedTheme = localStorage.getItem("wagaex_theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  const themeCheckbox = document.getElementById("btnTheme");
  themeCheckbox.checked = savedTheme === "dark";

  // Zapamiętaj punkt kliknięcia, żeby promieniowanie wyszło z przełącznika
  let punktKliku = null;
  const themeLabel = themeCheckbox.closest(".theme-switch");
  themeLabel?.addEventListener("pointerdown", (e) => {
    punktKliku = { x: e.clientX, y: e.clientY };
  });

  themeCheckbox.addEventListener("change", () => {
    const next = themeCheckbox.checked ? "dark" : "light";
    const p = punktKliku || {
      x: window.innerWidth - 40,
      y: window.innerHeight - 60,
    };
    przelaczMotyw(next, p.x, p.y);
    punktKliku = null;
  });

  // ==========================
  // SCROLL TO TOP (Baza)
  // ==========================
  const mainEl = document.querySelector(".main");
  const scrollBtn = document.getElementById("btnScrollTop");

  mainEl.addEventListener("scroll", () => {
    const bazaActive = document.getElementById("tab-baza").classList.contains("active");
    if (bazaActive && mainEl.scrollTop > 200) {
      scrollBtn.classList.add("visible");
    } else {
      scrollBtn.classList.remove("visible");
    }
  });

  scrollBtn.addEventListener("click", () => {
    mainEl.scrollTo({ top: 0, behavior: "smooth" });
  });

  // ==========================
  // FIRST RENDER (🔥 IMPORTANT)
  // ==========================
  renderBaze(appState);
  aktualizujBadge(appState);
}

// ==========================
// ANIMOWANE TŁO – pole dryfujących cząsteczek + linie (constellation)
// ==========================
let bgRafId = null; // id pętli animacji (null = zatrzymana)
let bgAktywna = true; // czy animacja ma działać
let bgStart = null; // funkcja startująca pętlę (ustawiana w initBackgroundFX)
let bgPoof = null; // efekt "poof" od punktu (ustawiany w initBackgroundFX)
let bgWidocznosc = null; // stopniowe pojawianie/znikanie (ustawiane w initBackgroundFX)

// Włącz/wyłącz animację tła i zapamiętaj wybór.
function setBgAnimacja(on) {
  bgAktywna = on;
  try {
    localStorage.setItem("wagaex_anim", on ? "on" : "off");
  } catch {
    // tryb prywatny — ignorujemy
  }

  // Pojawianie/znikanie cząstek po kolei (nie wszystkie na raz).
  // Pętla sama się zatrzyma i wyczyści, gdy wszystkie znikną.
  bgWidocznosc?.(on);
}

// ==========================
// ZMIANA MOTYWU – okrągłe promieniowanie od punktu kliknięcia
// ==========================
function przelaczMotyw(next, x, y) {
  const zastosuj = () => {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("wagaex_theme", next);
    } catch {
      // tryb prywatny — ignorujemy
    }
  };

  // Brak wsparcia View Transitions API → zmiana natychmiastowa
  if (!document.startViewTransition) {
    zastosuj();
    return;
  }

  const vt = document.startViewTransition(zastosuj);
  vt.ready
    .then(() => {
      const r = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      );
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${r}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 600,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => {});
}

function initBackgroundFX() {
  const canvas = document.getElementById("bgCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let W = 0,
    H = 0,
    dpr = 1;
  let czastki = [];
  let meteory = [];
  let blysk = 0; // chwilowy rozbłysk "poof" (1 → 0)
  let cel = 0; // docelowa widoczność (1 = pokaż, 0 = ukryj)
  const METEOR_SZANSA = 0.0028; // ~1 meteor co ~360 klatek
  const METEOR_MAX = 2;

  // Kursor i parametry interakcji
  let mx = null,
    my = null;
  const DYSTANS = 140; // maks. odległość łączenia liniami (px)
  const UCIECZKA_R = 130; // promień odpychania od kursora (px)
  const UCIECZKA_SILA = 1.1; // siła odpychania
  const WYBUCH_R = 200; // promień wybuchu po kliknięciu (px)
  const WYBUCH_SILA = 22; // siła wybuchu
  const TARCIE = 0.9; // sprężynowanie wychylenia z powrotem do 0
  const MAX_OFFSET = 150; // maks. wychylenie od pozycji bazowej (px)
  const RAMP = 0.045; // tempo narastania/zanikania widoczności
  const MAX_STAGGER = 50; // maks. losowe opóźnienie (klatki) — nierównomierność

  function nowaCzastka() {
    return {
      // pozycja bazowa — dryfuje równomiernie (utrzymuje gęstość)
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      // wychylenie z interakcji — sprężynuje do 0 (cząstka wraca na miejsce)
      ox: 0,
      oy: 0,
      // pozycja renderowana (bazowa + wychylenie)
      rx: 0,
      ry: 0,
      r: Math.random() * 1.6 + 0.6,
      tw: Math.random() * Math.PI * 2, // faza migotania
      wid: 0, // bieżąca widoczność (0..1)
      delay: 0, // opóźnienie startu ramp (klatki)
      pb: 0,   // per-cząstka rozbłysk przy pojawieniu (1→0)
    };
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const ile = Math.max(60, Math.min(140, Math.round((W * H) / 15000)));
    meteory = [];
    czastki = Array.from({ length: ile }, nowaCzastka);
    // Po zmianie rozmiaru nowe cząstki dostają aktualną widoczność (bez re-fade)
    for (const p of czastki) p.wid = cel;
  }

  function kolorAkcentu() {
    return (
      getComputedStyle(document.documentElement)
        .getPropertyValue("--accent")
        .trim() || "#00d4a0"
    );
  }

  // Ogranicz długość wektora wychylenia (zapobiega "wystrzeleniu" cząstki)
  function ogranicz(p) {
    const d = Math.hypot(p.ox, p.oy);
    if (d > MAX_OFFSET) {
      p.ox = (p.ox / d) * MAX_OFFSET;
      p.oy = (p.oy / d) * MAX_OFFSET;
    }
  }

  function spawnMeteor() {
    const kat = Math.PI / 5 + Math.random() * (Math.PI / 7); // ~26–51° od poziomu
    const spd = 4 + Math.random() * 3.5;
    const zGory = Math.random() < 0.65;
    return {
      x: zGory ? Math.random() * W * 0.85 : -10,
      y: zGory ? -10 : Math.random() * H * 0.45,
      vx: Math.cos(kat) * spd,
      vy: Math.sin(kat) * spd,
      life: 1,
      decay: 1 / (80 + Math.random() * 60), // żyje 80–140 klatek
      len: 55 + Math.random() * 75,
    };
  }

  // Wybuch — wychyl cząstki w promieniu od punktu kliknięcia (wrócą sprężyście)
  function wybuch(cx, cy) {
    for (const p of czastki) {
      const dx = p.rx - cx;
      const dy = p.ry - cy;
      const d = Math.hypot(dx, dy) || 1;
      if (d < WYBUCH_R) {
        const f = (1 - d / WYBUCH_R) * WYBUCH_SILA;
        p.ox += (dx / d) * f;
        p.oy += (dy / d) * f;
        ogranicz(p);
      }
    }
  }

  function klatka() {
    ctx.clearRect(0, 0, W, H);
    const kolor = kolorAkcentu();

    // Zanikanie rozbłysku "poof"
    blysk = blysk > 0.01 ? blysk * 0.92 : 0;

    // Aktualizacja: pozycja bazowa dryfuje, wychylenie sprężynuje do 0
    let widoczne = 0;
    for (const p of czastki) {
      // Stopniowe pojawianie/znikanie — każda cząstka ma własne opóźnienie
      if (p.delay > 0) {
        p.delay--;
        // Gdy opóźnienie mija i cząstka ma się pojawić — rozbłysk
        if (p.delay === 0 && cel === 1) p.pb = 1;
      } else if (p.wid < cel) p.wid = Math.min(cel, p.wid + RAMP);
      else if (p.wid > cel) p.wid = Math.max(cel, p.wid - RAMP);
      p.pb = p.pb > 0.01 ? p.pb * 0.92 : 0;
      if (p.wid > 0.01) widoczne++;

      // Bazowy dryf (utrzymuje równomierną gęstość — brak trwałych dziur)
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -10) p.x = W + 10;
      else if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10;
      else if (p.y > H + 10) p.y = -10;
      p.tw += 0.02;

      // Odpychanie liczone względem aktualnej pozycji renderowanej
      if (mx !== null) {
        const dx = p.x + p.ox - mx;
        const dy = p.y + p.oy - my;
        const d = Math.hypot(dx, dy) || 1;
        if (d < UCIECZKA_R) {
          const f = (1 - d / UCIECZKA_R) * UCIECZKA_SILA;
          p.ox += (dx / d) * f;
          p.oy += (dy / d) * f;
        }
      }

      // Sprężynowanie wychylenia z powrotem do zera + ograniczenie
      p.ox *= TARCIE;
      p.oy *= TARCIE;
      ogranicz(p);

      p.rx = p.x + p.ox;
      p.ry = p.y + p.oy;
    }

    // Linie między bliskimi cząsteczkami
    ctx.strokeStyle = kolor;
    ctx.lineWidth = 1;
    for (let i = 0; i < czastki.length; i++) {
      const a = czastki[i];
      for (let j = i + 1; j < czastki.length; j++) {
        const b = czastki[j];
        const dx = a.rx - b.rx;
        const dy = a.ry - b.ry;
        const d = Math.hypot(dx, dy);
        const w = Math.min(a.wid, b.wid);
        if (d < DYSTANS && w > 0.01) {
          ctx.globalAlpha = Math.min(
            1,
            ((1 - d / DYSTANS) * 0.2 + blysk * 0.45) * w,
          );
          ctx.beginPath();
          ctx.moveTo(a.rx, a.ry);
          ctx.lineTo(b.rx, b.ry);
          ctx.stroke();
        }
      }
    }

    // Linie od kursora do bliskich cząstek (interaktywny akcent)
    if (mx !== null) {
      for (const p of czastki) {
        const d = Math.hypot(p.rx - mx, p.ry - my);
        if (d < UCIECZKA_R) {
          ctx.globalAlpha = (1 - d / UCIECZKA_R) * 0.35 * p.wid;
          ctx.beginPath();
          ctx.moveTo(mx, my);
          ctx.lineTo(p.rx, p.ry);
          ctx.stroke();
        }
      }
    }

    // Spadające gwiazdy (meteory)
    if (cel === 1 && meteory.length < METEOR_MAX && Math.random() < METEOR_SZANSA) {
      meteory.push(spawnMeteor());
    }
    ctx.lineWidth = 1.2;
    for (let i = meteory.length - 1; i >= 0; i--) {
      const m = meteory[i];
      m.life -= m.decay;
      if (m.life <= 0 || m.x > W + 20 || m.y > H + 20) { meteory.splice(i, 1); continue; }
      m.x += m.vx;
      m.y += m.vy;
      const spd = Math.hypot(m.vx, m.vy);
      const tx = m.x - (m.vx / spd) * m.len;
      const ty = m.y - (m.vy / spd) * m.len;
      const grad = ctx.createLinearGradient(tx, ty, m.x, m.y);
      const a = m.life * 0.45;
      grad.addColorStop(0, `rgba(255,255,255,0)`);
      grad.addColorStop(0.6, `rgba(255,255,255,${(a * 0.5).toFixed(2)})`);
      grad.addColorStop(1, `rgba(255,255,255,${a.toFixed(2)})`);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(m.x, m.y);
      ctx.stroke();
      // Świecący czubek
      ctx.globalAlpha = m.life * 0.7;
      ctx.fillStyle = "#ffffff";
      ctx.shadowBlur = 7;
      ctx.shadowColor = "#ffffff";
      ctx.beginPath();
      ctx.arc(m.x, m.y, 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Migoczące punkty (jaśniejsze i większe podczas "poof")
    ctx.fillStyle = kolor;
    ctx.shadowColor = kolor;
    for (const p of czastki) {
      const fl = Math.max(p.pb, blysk); // per-cząstka lub globalny poof
      ctx.globalAlpha = Math.min(1, (0.5 + Math.sin(p.tw) * 0.3 + fl * 0.6) * p.wid);
      ctx.shadowBlur = fl * 14;
      ctx.beginPath();
      ctx.arc(p.rx, p.ry, p.r * (1 + fl * 2), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    ctx.globalAlpha = 1;

    // Gdy wyłączone i wszystkie cząstki zniknęły — zatrzymaj i wyczyść
    if (cel === 0 && widoczne === 0) {
      ctx.clearRect(0, 0, W, H);
      bgRafId = null;
      return;
    }
    bgRafId = requestAnimationFrame(klatka);
  }

  bgStart = () => {
    if (!bgRafId) bgRafId = requestAnimationFrame(klatka);
  };

  // Stopniowe pojawianie (on=true) / znikanie (on=false) — losowy stagger
  bgWidocznosc = (on) => {
    cel = on ? 1 : 0;
    for (const p of czastki) p.delay = Math.floor(Math.random() * MAX_STAGGER);
    bgStart();
  };

  // "Poof" — cząstki wybuchają na zewnątrz od punktu + rozbłysk jasności
  bgPoof = (x, y) => {
    blysk = 1;
    for (const p of czastki) {
      const dx = p.x - x;
      const dy = p.y - y;
      const d = Math.hypot(dx, dy) || 1;
      const f = WYBUCH_SILA * (0.5 + 0.5 * (1 - Math.min(d, 700) / 700));
      p.ox += (dx / d) * f;
      p.oy += (dy / d) * f;
      ogranicz(p);
    }
  };

  // Śledzenie kursora i kliknięć (canvas ma pointer-events:none,
  // więc nasłuchujemy globalnie na oknie)
  window.addEventListener("pointermove", (e) => {
    mx = e.clientX;
    my = e.clientY;
  });
  window.addEventListener("pointerout", () => {
    mx = my = null;
  });
  window.addEventListener("pointerdown", (e) => {
    if (bgAktywna) wybuch(e.clientX, e.clientY);
  });

  window.addEventListener("resize", resize);
  resize();
  // Start: jeśli animacja włączona, cząstki pojawiają się stopniowo
  if (bgAktywna) bgWidocznosc(true);
}

// ==========================
// START APP
// ==========================
document.addEventListener("DOMContentLoaded", init);
