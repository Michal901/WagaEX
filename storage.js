// ===== STORAGE MODULE =====
const API_BASE = 'http://localhost:3001';

export class StorageManager {
  constructor() {
    this.keys = {
      historia: "wagaex_historia",
      baza: "wagaex_baza",
      stat: "wagaex_stat",
    };
  }

  async save(key, value) {
    if (key === 'baza') {
      await this.saveBazaToAPI(value);
    } else {
      localStorage.setItem(this.keys[key], JSON.stringify(value));
    }
  }

  async load(key, defaultValue = null) {
    if (key === 'baza') {
      return await this.loadBazaFromAPI(defaultValue);
    } else {
      try {
        const value = localStorage.getItem(this.keys[key]);
        return value ? JSON.parse(value) : defaultValue;
      } catch {
        return defaultValue;
      }
    }
  }

  async saveBazaToAPI(baza) {
    try {
      // Save each product individually
      const promises = Object.entries(baza).map(([id, product]) =>
        fetch(`${API_BASE}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            nazwa: product.nazwa,
            waga: product.waga,
            ostatnioUzyta: product.ostatnioUzyta
          })
        })
      );
      await Promise.all(promises);
    } catch (error) {
      console.error('Failed to save baza to API:', error);
      // Fallback to localStorage
      localStorage.setItem(this.keys.baza, JSON.stringify(baza));
    }
  }

  async loadBazaFromAPI(defaultValue = {}) {
    try {
      const response = await fetch(`${API_BASE}/products`);
      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`API returned ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to load baza from API:', error);
      // Fallback to localStorage
      try {
        const value = localStorage.getItem(this.keys.baza);
        return value ? JSON.parse(value) : defaultValue;
      } catch {
        return defaultValue;
      }
    }
  }
}
