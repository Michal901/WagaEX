// ===== PALETY KOLORÓW (akcent) – osobno dla motywu ciemnego i jasnego =====

// Każda paleta definiuje kolor akcentu [accent, accent2] dla obu motywów,
// tak aby zachować odpowiedni kontrast w jasnym i ciemnym tle.
const PALETY = [
  { id: "teal",   nazwa: "Szmaragd", dark: ["#00d4a0", "#00a87e"], light: ["#008c68", "#006e52"] },
  { id: "blue",   nazwa: "Błękit",   dark: ["#3b9eff", "#2b7fd4"], light: ["#2563eb", "#1d4ed8"] },
  { id: "violet", nazwa: "Fiolet",   dark: ["#a78bfa", "#8b6ef0"], light: ["#7c3aed", "#6d28d9"] },
  { id: "amber",  nazwa: "Bursztyn", dark: ["#ffb020", "#e0900a"], light: ["#b45309", "#92400e"] },
  { id: "rose",   nazwa: "Róż",      dark: ["#ff6b81", "#e84d63"], light: ["#e11d48", "#be123c"] },
  { id: "cyan",   nazwa: "Lazur",    dark: ["#22d3ee", "#0891b2"], light: ["#0891b2", "#0e7490"] },
];

const KLUCZ = { dark: "wagaex_palette_dark", light: "wagaex_palette_light" };
const DOMYSLNA = "teal";

function hexToRgba(hex, a) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function aktualnyMotyw() {
  return document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";
}

function wczytajPalete(mode) {
  try {
    return localStorage.getItem(KLUCZ[mode]) || DOMYSLNA;
  } catch {
    return DOMYSLNA;
  }
}

function zapiszPalete(mode, id) {
  try {
    localStorage.setItem(KLUCZ[mode], id);
  } catch {
    // tryb prywatny — ignorujemy
  }
}

// Nałóż akcent zapisanej palety dla danego trybu na zmienne CSS (inline na :root).
// Wywoływane przy starcie oraz po każdej zmianie motywu.
export function zastosujPalete(mode = aktualnyMotyw()) {
  const id = wczytajPalete(mode);
  const p = PALETY.find((x) => x.id === id) || PALETY[0];
  const [accent, accent2] = p[mode];
  const dimAlpha = mode === "light" ? 0.1 : 0.14;
  const root = document.documentElement.style;
  root.setProperty("--accent", accent);
  root.setProperty("--accent2", accent2);
  root.setProperty("--accent-dim", hexToRgba(accent, dimAlpha));
}

// Zbuduj przycisk + mini menu (popover) z paletami i podłącz interakcje.
export function initPalety() {
  const btn = document.getElementById("btnPalette");
  if (!btn) return;

  const pop = document.createElement("div");
  pop.className = "palette-pop";
  pop.setAttribute("role", "menu");

  const sekcja = (mode, tytul) => {
    const swatche = PALETY.map((p) => {
      const [accent, accent2] = p[mode];
      return `<button class="palette-swatch" data-mode="${mode}" data-id="${p.id}" title="${p.nazwa}" aria-label="${p.nazwa}" style="--sw1:${accent};--sw2:${accent2}"></button>`;
    }).join("");
    return `<div class="palette-section">
      <div class="palette-section-label">${tytul}</div>
      <div class="palette-swatches">${swatche}</div>
    </div>`;
  };

  pop.innerHTML = sekcja("dark", "Ciemny") + sekcja("light", "Jasny");
  document.body.appendChild(pop);

  const oznaczWybrane = () => {
    pop.querySelectorAll(".palette-swatch").forEach((s) => {
      s.classList.toggle(
        "selected",
        wczytajPalete(s.dataset.mode) === s.dataset.id,
      );
    });
  };

  const pozycjonuj = () => {
    const r = btn.getBoundingClientRect();
    pop.style.visibility = "hidden";
    pop.style.display = "block";
    const ph = pop.offsetHeight;
    const pw = pop.offsetWidth;
    // Domyślnie otwórz nad przyciskiem; jeśli brak miejsca — pod nim.
    let top = r.top - ph - 8;
    if (top < 8) top = r.bottom + 8;
    let left = r.left + r.width / 2 - pw / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
    pop.style.top = `${top}px`;
    pop.style.left = `${left}px`;
    pop.style.visibility = "";
  };

  const otworz = () => {
    oznaczWybrane();
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
    const sw = e.target.closest(".palette-swatch");
    if (!sw) return;
    const mode = sw.dataset.mode;
    zapiszPalete(mode, sw.dataset.id);
    if (mode === aktualnyMotyw()) zastosujPalete(mode);
    oznaczWybrane();
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

  // Zastosuj zapisaną paletę dla bieżącego motywu na starcie.
  zastosujPalete();
}
