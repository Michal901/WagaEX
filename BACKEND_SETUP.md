# WagaEX z Backendem

Aby uruchomić aplikację z backendem dla bazy produktów:

1. Uruchom backend:

   ```bash
   cd backend
   npm start
   ```

2. Uruchom aplikację frontend w przeglądarce (np. przez XAMPP na localhost).

Backend działa na porcie 3001, frontend na standardowym porcie Apache (80).

## Funkcjonalność

- Baza produktów jest teraz przechowywana w SQLite przez API
- Historia i statystyki pozostają w localStorage
- Przy awarii API, automatycznie przełącza się na localStorage jako fallback
- Dane są synchronizowane między localStorage a API

## Migracja

Jeśli masz istniejącą bazę w localStorage, zostanie ona automatycznie przesłana do API przy pierwszym uruchomieniu.
