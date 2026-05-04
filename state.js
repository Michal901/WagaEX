// ===== STATE MODULE =====
export class AppState {
  constructor(storage) {
    this.storage = storage;
    this.historia = this.storage.load("historia", []);
    this.baza = this.storage.load("baza", {});
    this.biezacaSesja = [];
    this.aktualneWyniki = null;
  }

  saveToStorage() {
    this.storage.save("historia", this.historia);
    this.storage.save("baza", this.baza);
  }

  addToHistoria(sesja) {
    this.historia.push(sesja);
    this.saveToStorage();
  }

  updateBaza(produkty, data) {
    produkty.forEach((p) => {
      const key = p.nazwa.toLowerCase().trim();
      this.baza[key] = {
        nazwa: p.nazwa,
        waga: p.waga,
        ostatnioUzyta: data,
        lacznaIlosc: (this.baza[key]?.lacznaIlosc || 0) + p.ilosc,
      };
    });
    this.saveToStorage();
  }
}
