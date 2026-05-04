import { createClient } from "https://esm.sh/@supabase/supabase-js";

const SUPABASE_URL = "https://nxlkqlylimffykelxrgl.supabase.co";
const SUPABASE_KEY = "sb_publishable_AwkQiTf-N7S2m-UeQrM7RQ_5J961ZQb";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export class StorageManager {
  constructor() {
    this.keys = {
      historia: "wagaex_historia",
      stat: "wagaex_stat",
    };
  }

  // =========================
  // LOCAL STORAGE (historia/stat)
  // =========================
  async save(key, value) {
    if (key === "baza") {
      return await this.saveBaza(value);
    }

    localStorage.setItem(this.keys[key], JSON.stringify(value));
  }

  async load(key, defaultValue = null) {
    if (key === "baza") {
      return await this.loadBaza(defaultValue);
    }

    try {
      const value = localStorage.getItem(this.keys[key]);
      return value ? JSON.parse(value) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  // =========================
  // SUPABASE LOAD
  // =========================
  async loadBaza(defaultValue = {}) {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("ostatnio_uzyta", { ascending: false });

    if (error) {
      console.error("Supabase LOAD error:", error);
      return defaultValue;
    }

    const result = {};

    (data || []).forEach((p) => {
      result[p.id] = {
        nazwa: p.nazwa,
        waga: Number(p.waga),
        ostatnioUzyta: p.ostatnio_uzyta,
      };
    });

    return result;
  }

  // =========================
  // SUPABASE UPSERT (SAVE)
  // =========================
  async saveBaza(baza) {
    const rows = Object.entries(baza).map(([id, p]) => ({
      id,
      nazwa: p.nazwa,
      waga: Number(p.waga),
      ostatnio_uzyta: p.ostatnioUzyta,
    }));

    const { error } = await supabase
      .from("products")
      .upsert(rows, { onConflict: "id" });

    if (error) {
      console.error("Supabase SAVE error:", error);
    }
  }

  // =========================
  // 🔥 DELETE (MISSING BEFORE)
  // =========================
  async deleteFromBaza(id) {
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      console.error("Supabase DELETE error:", error);
    }
  }
}
