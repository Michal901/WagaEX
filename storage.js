import { createClient } from "https://esm.sh/@supabase/supabase-js";

// =========================
// SUPABASE
// =========================
const SUPABASE_URL = "https://nxlkqlylimffykelxrgl.supabase.co";
const SUPABASE_KEY = "sb_publishable_AwkQiTf-N7S2m-UeQrM7RQ_5J961ZQb";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// =========================
// HELPERS (🔥 STABILNOŚĆ DANYCH)
// =========================
const normId = (id) => String(id).toLowerCase().trim().replace(/\s+/g, " ");

const toNumber = (v) => Number(v) || 0;

const toISO = (v) => {
  try {
    return new Date(v || Date.now()).toISOString();
  } catch {
    return new Date().toISOString();
  }
};

// =========================
// STORAGE MANAGER
// =========================
export class StorageManager {
  constructor() {
    this.keys = {
      historia: "wagaex_historia",
      stat: "wagaex_stat",
    };
  }

  // =========================
  // SAVE WRAPPER
  // =========================
  async save(key, value) {
    if (key === "baza") {
      return await this.saveBaza(value);
    }

    localStorage.setItem(this.keys[key], JSON.stringify(value));
  }

  // =========================
  // LOAD WRAPPER
  // =========================
  async load(key, defaultValue = null) {
    if (key === "baza") {
      return await this.loadBaza(defaultValue);
    }

    try {
      const v = localStorage.getItem(this.keys[key]);
      return v ? JSON.parse(v) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  // =========================
  // UPSERT (SAVE)
  // =========================
  async saveBaza(baza) {
    const rows = Object.entries(baza).map(([id, p]) => ({
      id: normId(id),
      nazwa: p.nazwa,
      waga: toNumber(p.waga),
      ostatnio_uzyta: toISO(p.ostatnioUzyta),
    }));

    const { error } = await supabase.from("products").upsert(rows);

    if (error) {
      console.error("❌ SAVE ERROR:", error.message);
    }
  }

  // =========================
  // SELECT (LOAD)
  // =========================
  async loadBaza(defaultValue = {}) {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("ostatnio_uzyta", { ascending: false });

    if (error) {
      console.error("❌ LOAD ERROR:", error.message);
      return defaultValue;
    }

    if (!data?.length) return defaultValue;

    const result = {};

    for (const p of data) {
      const key = normId(p.id);
      result[key] = {
        id: key,
        nazwa: p.nazwa,
        waga: toNumber(p.waga),
        ostatnioUzyta: toISO(p.ostatnio_uzyta),
      };
    }

    return result;
  }

  // =========================
  // DELETE (🔥 100% FIXED)
  // =========================
  async deleteFromBaza(id) {
    const cleanId = normId(id);

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", cleanId);

    if (error) {
      console.error("❌ DELETE ERROR:", error.message);
    }

    // 🔥 zawsze zwracamy świeżą bazę
    return await this.loadBaza({});
  }
}
