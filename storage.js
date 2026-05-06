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
      kod: p.kod || "",
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
        kod: p.kod || "",
        waga: toNumber(p.waga),
        ostatnioUzyta: toISO(p.ostatnio_uzyta),
      };
    }

    return result;
  }

  // =========================
  // SESSIONS HISTORY BACKEND
  // =========================
  async saveSession(sesja) {
    console.log("💾 Saving session to Supabase:", sesja);
    if (!sesja || !sesja.id) return;

    const sessionRow = {
      id: sesja.id,
      nr: sesja.nr,
      data: toISO(sesja.data),
      total_kg: Number(sesja.totalKg.toFixed(2)),
    };

    const { error: sessionError } = await supabase
      .from("sessions")
      .insert([sessionRow], { returning: "minimal" });

    if (sessionError) {
      console.error("❌ SESSION SAVE ERROR:", sessionError.message);
      return;
    }
    console.log("✅ Session saved:", sessionRow);

    const norms = (sesja.normy || []).map((n) => ({
      id: n.id,
      session_id: sesja.id,
      nr: n.nr,
      label: n.label,
      total_kg: Number(n.totalKg.toFixed(2)),
    }));

    const { error: normsError } = await supabase
      .from("norms")
      .insert(norms, { returning: "minimal" });

    if (normsError) {
      console.error("❌ NORMS SAVE ERROR:", normsError.message);
      await supabase.from("sessions").delete().eq("id", sesja.id);
      return;
    }
    console.log("✅ Norms saved:", norms);

    const products = (sesja.normy || []).flatMap((n) =>
      (n.produkty || []).map((p) => ({
        norm_id: n.id,
        nazwa: p.nazwa,
        waga: Number(p.waga),
        ilosc: Number(p.ilosc),
        ilosc_x: Number(
          p.iloscX !== undefined && p.iloscX !== null ? p.iloscX : p.ilosc,
        ),
      })),
    );

    const { error: productsError } = await supabase
      .from("norm_products")
      .insert(products, { returning: "minimal" });

    if (productsError) {
      console.error("❌ NORM PRODUCTS SAVE ERROR:", productsError.message);
      await supabase.from("sessions").delete().eq("id", sesja.id);
      return;
    }
    console.log("✅ Products saved:", products);
  }

  async loadHistory(defaultValue = []) {
    const { data, error } = await supabase
      .from("sessions")
      .select(
        `id,nr,data,total_kg,norms(id,nr,label,total_kg,norm_products(nazwa,waga,ilosc,ilosc_x))`,
      )
      .order("data", { ascending: true });

    if (error) {
      console.error("❌ LOAD HISTORY ERROR:", error.message);
      return defaultValue;
    }

    if (!data?.length) return defaultValue;

    return data.map((row) => ({
      id: row.id,
      nr: row.nr,
      data: toISO(row.data),
      totalKg: toNumber(row.total_kg),
      normy: (row.norms || []).map((n) => ({
        id: n.id,
        nr: n.nr,
        label: n.label,
        totalKg: toNumber(n.total_kg),
        produkty: (n.norm_products || []).map((p) => ({
          nazwa: p.nazwa,
          waga: toNumber(p.waga),
          ilosc: toNumber(p.ilosc),
          iloscX: toNumber(p.ilosc_x),
        })),
      })),
    }));
  }

  // =========================  // DELETE SESSION
  // =========================
  async deleteSession(id) {
    const { error } = await supabase.from("sessions").delete().eq("id", id);

    if (error) {
      console.error("❌ DELETE SESSION ERROR:", error.message);
    }
  }

  // =========================  // DELETE (🔥 100% FIXED)
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
