# WagaEX Backend

Prosty backend API dla bazy produktów aplikacji WagaEX.

## Uruchomienie

1. Zainstaluj zależności:
   ```bash
   npm install
   ```

2. Uruchom serwer:
   ```bash
   npm start
   ```

   Lub w trybie deweloperskim (auto-reload):
   ```bash
   npm run dev
   ```

Serwer będzie dostępny na `http://localhost:3001`

## API Endpoints

- `GET /products` - Pobierz wszystkie produkty
- `POST /products` - Dodaj/zaktualizuj produkt
- `DELETE /products/:id` - Usuń produkt
- `GET /health` - Sprawdź status serwera

## Baza danych

Używa SQLite (`products.db`) do przechowywania produktów. Plik bazy danych zostanie utworzony automatycznie przy pierwszym uruchomieniu.

## Migracja danych

Jeśli masz istniejącą bazę w localStorage, dane zostaną automatycznie przeniesione do API przy pierwszym uruchomieniu aplikacji z backendem.