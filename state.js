// ===== STATE MODULE =====
export class AppState {
  constructor(storage) {
    this.storage = storage;
    this.historia = [];
    this.baza = {};
    this.biezacaSesja = [];
    this.aktualneWyniki = null;
  }

  async init() {
    const historiaLocal = await this.storage.load("historia", []);
    const historiaBackend = await this.storage.loadHistory([]);

    const merged = new Map();
    [
      ...historiaBackend,
      ...(Array.isArray(historiaLocal) ? historiaLocal : []),
    ].forEach((s) => {
      merged.set(s.id, s);
    });

    this.historia = Array.from(merged.values()).sort(
      (a, b) => new Date(a.data) - new Date(b.data),
    );

    const baza = await this.storage.load("baza", {});
    this.baza =
      baza && typeof baza === "object" && !Array.isArray(baza) ? baza : {};
  }

  async saveToStorage() {
    await Promise.all([
      this.storage.save(
        "historia",
        Array.isArray(this.historia) ? this.historia : [],
      ),
      this.storage.save(
        "baza",
        this.baza && typeof this.baza === "object" ? this.baza : {},
      ),
    ]);
  }

  async addToHistoria(sesja) {
    if (!Array.isArray(this.historia)) {
      this.historia = [];
    }
    this.historia.push(sesja);
    await this.saveToStorage();
  }

  async updateBaza(produkty, data) {
    produkty.forEach((p) => {
      const key = p.nazwa.toLowerCase().trim();
      this.baza[key] = {
        id: key,
        nazwa: p.nazwa,
        kod: p.kod || "",
        waga: p.waga,
        ostatnioUzyta: data,
        lacznaIlosc: (this.baza[key]?.lacznaIlosc || 0) + p.ilosc,
      };
    });
    await this.saveToStorage();
  }
}
