// ===== STORAGE MODULE =====
export class StorageManager {
  constructor() {
    this.keys = {
      historia: "wagaex_historia",
      baza: "wagaex_baza",
      stat: "wagaex_stat",
    };
  }

  save(key, value) {
    localStorage.setItem(this.keys[key], JSON.stringify(value));
  }

  load(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(this.keys[key]);
      return value ? JSON.parse(value) : defaultValue;
    } catch {
      return defaultValue;
    }
  }
}
