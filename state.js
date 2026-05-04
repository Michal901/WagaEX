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
    this.historia = await this.storage.load("historia", []);
    this.baza = await this.storage.load("baza", {});
  }

  async saveToStorage() {
    await Promise.all([
      this.storage.save("historia", this.historia),
      this.storage.save("baza", this.baza),
    ]);
  }

  async addToHistoria(sesja) {
    this.historia.push(sesja);
    await this.saveToStorage();
  }

  async updateBaza(produkty, data) {
    produkty.forEach((p) => {
      const key = p.nazwa.toLowerCase().trim();
      this.baza[key] = {
        id: key,
        nazwa: p.nazwa,
        waga: p.waga,
        ostatnioUzyta: data,
        lacznaIlosc: (this.baza[key]?.lacznaIlosc || 0) + p.ilosc,
      };
    });
    await this.saveToStorage();
  }
}
