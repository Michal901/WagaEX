// ===== TŁA ANIMOWANE – przełączalne efekty na #bgCanvas =====
// "Konstelacja" to bogaty, interaktywny silnik z main.js (przekazywany tu jako
// kontroler). Pozostałe efekty są samodzielne i rejestrowane w EFEKTY — dodanie
// kolejnego z WagaEXAnimations.jsx sprowadza się do dopisania wpisu + pozycji w TLA.

const KLUCZ = "wagaex_bg";
const DOMYSLNE = "constellation";

// Kolejność = kolejność w menu
const TLA = [
  { id: "constellation", nazwa: "Konstelacja" },
  { id: "gridpulse", nazwa: "Grid pulse" },
];

// Kolor akcentu z motywu (palety) jako [r,g,b] — efekty czytają go na bieżąco.
function accentRGB() {
  const v =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--accent")
      .trim() || "#00d4a0";
  if (v.startsWith("#")) {
    const h = v.slice(1);
    const hh = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    return [
      parseInt(hh.slice(0, 2), 16),
      parseInt(hh.slice(2, 4), 16),
      parseInt(hh.slice(4, 6), 16),
    ];
  }
  const m = v.match(/(\d+)[ ,]+(\d+)[ ,]+(\d+)/);
  return m ? [+m[1], +m[2], +m[3]] : [0, 212, 160];
}

// ── Rejestr samodzielnych efektów (init + render na canvasie w pikselach CSS) ──
const EFEKTY = {
  // BG: Grid pulse — interaktywna siatka z poświatą, winietą i falami od kliknięć.
  // Kolor z motywu (palety). Wymiary logiczne (CSS px) w s.W/s.H, pozycja
  // kursora w s.mx/s.my, fale uderzeniowe w s.shocks (dostarcza menedżer).
  gridpulse: {
    init(ctx, cv, s) {
      s.gpTime = 0;
      if (!s.shocks) s.shocks = [];
    },
    render(ctx, cv, s) {
      const W = s.W || cv.width;
      const H = s.H || cv.height;
      const [r, g, b] = accentRGB();
      const col = (a) => `rgba(${r},${g},${b},${a})`;

      ctx.clearRect(0, 0, W, H);
      s.gpTime += 0.018;

      const step = 40;
      const cx = W / 2;
      const cy = H / 2;
      const maxD = Math.hypot(W, H) / 2;
      const mx = s.mx;
      const my = s.my;
      const R = 180;
      const BAND = 26;

      // ── Fale uderzeniowe: aktualizacja ──
      s.shocks = (s.shocks || []).filter((w) => w.life > 0);
      for (const w of s.shocks) {
        w.r += 6.5;
        w.life -= 0.011;
      }

      const vignette = (x, y) => {
        const nd = Math.hypot(x - cx, y - cy) / maxD;
        return Math.max(0, 1 - nd * nd * 0.85);
      };
      const boost = (x, y) => {
        let add = 0;
        if (mx != null) {
          const dm = Math.hypot(x - mx, y - my);
          if (dm < R) { const t = 1 - dm / R; add += t * t * 0.6; }
        }
        for (const w of s.shocks) {
          const dr = Math.abs(Math.hypot(x - w.x, y - w.y) - w.r);
          if (dr < BAND) add += (1 - dr / BAND) * w.life * 0.8;
        }
        return add;
      };

      // ── Linie siatki ──
      ctx.lineWidth = 0.7;
      for (let x = 0; x <= W; x += step) {
        const d = Math.abs(x - cx) / W;
        const a = (0.02 + 0.1 * Math.max(0, Math.sin(s.gpTime - d * 6))) * vignette(x, cy);
        if (a <= 0.005) continue;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H);
        ctx.strokeStyle = col(a); ctx.stroke();
      }
      for (let y = 0; y <= H; y += step) {
        const d = Math.abs(y - cy) / H;
        const a = (0.02 + 0.1 * Math.max(0, Math.sin(s.gpTime - d * 6))) * vignette(cx, y);
        if (a <= 0.005) continue;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y);
        ctx.strokeStyle = col(a); ctx.stroke();
      }

      // ── Reflektor kursora ──
      if (mx != null) {
        const gr = ctx.createRadialGradient(mx, my, 0, mx, my, R);
        gr.addColorStop(0, col(0.1));
        gr.addColorStop(1, col(0));
        ctx.fillStyle = gr;
        ctx.fillRect(mx - R, my - R, R * 2, R * 2);
      }

      // ── Węzły z poświatą ──
      for (let x = 0; x <= W; x += step) {
        for (let y = 0; y <= H; y += step) {
          const dd = Math.hypot(x - cx, y - cy) / maxD;
          let a = 0.11 + 0.36 * Math.max(0, Math.sin(s.gpTime * 2 - dd * 8));
          a = (a + boost(x, y)) * vignette(x, y);
          if (a <= 0.04) continue;
          a = Math.min(1, a);
          const bright = a > 0.5;
          if (bright) { ctx.shadowColor = col(0.9); ctx.shadowBlur = 8; }
          ctx.beginPath();
          ctx.arc(x, y, bright ? 1.2 + a * 1.6 : 1.1, 0, Math.PI * 2);
          ctx.fillStyle = col(a);
          ctx.fill();
          if (bright) ctx.shadowBlur = 0;
        }
      }

      // ── Pierścienie fal uderzeniowych ──
      for (const w of s.shocks) {
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
        ctx.strokeStyle = col(w.life * 0.12);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    },
  },
};

let canvas = null;
let ctx = null;
let constellation = null; // { setVisible, hardStop, resize } z main.js
let enabled = true;
let current = DOMYSLNE;
let altRaf = null;
let altState = {};
let altResize = null;
let altListeners = []; // [typ, handler] — interakcja kursora dla efektów alt
let constSuspended = false; // czy konstelacja została zawieszona przez inne tło

function readBg() {
  try {
    return localStorage.getItem(KLUCZ) || DOMYSLNE;
  } catch {
    return DOMYSLNE;
  }
}
function writeBg(id) {
  try {
    localStorage.setItem(KLUCZ, id);
  } catch {
    // tryb prywatny — ignorujemy
  }
}

function sizeAltCanvas() {
  // Ostrość na Hi-DPI: bufor w pikselach urządzenia, rysowanie w pikselach CSS.
  // Logiczne wymiary trafiają do stanu efektu (s.W/s.H).
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  altState.W = w;
  altState.H = h;
}

function startAlt(id) {
  stopAlt();
  const fx = EFEKTY[id];
  if (!fx) return;
  altState = {};
  sizeAltCanvas();
  fx.init(ctx, canvas, altState);
  const loop = () => {
    fx.render(ctx, canvas, altState, performance.now());
    altRaf = requestAnimationFrame(loop);
  };
  altRaf = requestAnimationFrame(loop);

  altResize = () => {
    sizeAltCanvas();
    fx.init(ctx, canvas, altState);
  };
  window.addEventListener("resize", altResize);

  // Interakcja: pozycja kursora (logiczne px) + fale od kliknięć.
  const punkt = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onMove = (e) => {
    const p = punkt(e);
    altState.mx = p.x;
    altState.my = p.y;
  };
  const onOut = () => {
    altState.mx = null;
    altState.my = null;
  };
  const onDown = (e) => {
    const p = punkt(e);
    (altState.shocks = altState.shocks || []).push({
      x: p.x,
      y: p.y,
      r: 0,
      life: 1,
    });
  };
  altListeners = [
    ["pointermove", onMove],
    ["pointerout", onOut],
    ["pointerdown", onDown],
  ];
  altListeners.forEach(([t, h]) => window.addEventListener(t, h));
}

function stopAlt() {
  if (altRaf) {
    cancelAnimationFrame(altRaf);
    altRaf = null;
  }
  if (altResize) {
    window.removeEventListener("resize", altResize);
    altResize = null;
  }
  altListeners.forEach(([t, h]) => window.removeEventListener(t, h));
  altListeners = [];
  if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function apply() {
  if (current === "constellation") {
    stopAlt();
    if (constellation) {
      // Odśwież canvas konstelacji tylko po powrocie z innego tła
      // (inny efekt zmienił rozmiar/transformację canvasu).
      if (constSuspended) {
        constellation.resize();
        constSuspended = false;
      }
      constellation.setVisible(enabled);
    }
  } else {
    constellation?.hardStop();
    constSuspended = true;
    if (enabled) startAlt(current);
    else stopAlt();
  }
}

export function setEnabled(on) {
  enabled = on;
  apply();
}

export function setBackground(id) {
  current = id;
  writeBg(id);
  apply();
}

export function getBackground() {
  return current;
}

// ── Mini-menu (popover) wyboru tła — obok przycisku palety ──
function buildMenu() {
  const btn = document.getElementById("btnBg");
  if (!btn) return;

  const pop = document.createElement("div");
  pop.className = "bg-pop";
  pop.setAttribute("role", "menu");
  pop.innerHTML =
    `<div class="bg-pop-label">Tło animacji</div>` +
    TLA.map(
      (t) => `<button class="bg-item" data-id="${t.id}">${t.nazwa}</button>`,
    ).join("");
  document.body.appendChild(pop);

  const oznacz = () => {
    pop.querySelectorAll(".bg-item").forEach((it) => {
      it.classList.toggle("selected", it.dataset.id === current);
    });
  };

  const pozycjonuj = () => {
    const r = btn.getBoundingClientRect();
    pop.style.visibility = "hidden";
    pop.style.display = "block";
    const ph = pop.offsetHeight;
    const pw = pop.offsetWidth;
    let top = r.top - ph - 8;
    if (top < 8) top = r.bottom + 8;
    let left = r.left + r.width / 2 - pw / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
    pop.style.top = `${top}px`;
    pop.style.left = `${left}px`;
    pop.style.visibility = "";
  };

  const otworz = () => {
    oznacz();
    pozycjonuj();
    pop.classList.add("open");
    btn.setAttribute("aria-expanded", "true");
  };
  const zamknij = () => {
    pop.classList.remove("open");
    pop.style.display = "";
    btn.setAttribute("aria-expanded", "false");
  };

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    pop.classList.contains("open") ? zamknij() : otworz();
  });

  pop.addEventListener("click", (e) => {
    const it = e.target.closest(".bg-item");
    if (!it) return;
    setBackground(it.dataset.id);
    oznacz();
    zamknij();
  });

  document.addEventListener("click", (e) => {
    if (
      pop.classList.contains("open") &&
      !pop.contains(e.target) &&
      e.target !== btn
    ) {
      zamknij();
    }
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") zamknij();
  });
  window.addEventListener("resize", () => {
    if (pop.classList.contains("open")) pozycjonuj();
  });
}

export function initBackgrounds(opts) {
  canvas = opts.canvas;
  constellation = opts.constellation;
  enabled = opts.enabled;
  ctx = canvas ? canvas.getContext("2d") : null;
  current = readBg();
  buildMenu();
  apply();
}
