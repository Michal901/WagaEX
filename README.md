# WagaEX – Kalkulator Magazynowy

Aplikacja webowa do obliczania wagi zamówień eksportowych. Umożliwia szybkie przeliczanie norm klientów, tworzenie zbiorówek i zarządzanie historią sesji.

## Funkcjonalności

### Kalkulator norm
- Wklejanie danych z Excela (format: nazwa produktu + kod + waga + ilość)
- Automatyczne rozpoznawanie kodów produktów (alfanumeryczne i numeryczne)
- Automatyczne rozpoznawanie wagi (szuka wzorca "Xkg" w tekście)
- Mnożnik norm (1–8) — dla klientów z wieloma identycznymi normami
- Edycja inline ilości i wagi bezpośrednio w tabeli wyników
- Walidacja wagi z bazą produktów (ostrzeżenia przy rozbieżnościach)
- Drukowanie pojedynczej normy
- Kopiowanie normy do schowka (format gotowy do ponownego wklejenia)

### Sesja (bieżąca praca)
- Dodawanie wielu norm do jednej sesji (max 8)
- Podgląd każdej normy z tabelą produktów
- Kopiowanie/drukowanie/usuwanie poszczególnych norm
- Łączna waga sesji z ostrzeżeniem >50kg
- Reset sesji

### Zbiorówka
- Automatyczna agregacja produktów ze wszystkich norm w sesji
- Sumowanie ilości identycznych produktów (po nazwie)
- Sortowanie po wadze łącznej (najcięższe na górze)
- Drukowanie zbiorówki (automatycznie zapisuje do historii)
- Zapisywanie sesji do historii

### Historia sesji
- Przeglądanie zapisanych sesji z datą, liczbą norm i wagą
- Rozwijane szczegóły: normy w sesji + zbiorówka
- Kopiowanie pojedynczych norm z historii do schowka
- Kopiowanie zbiorówki z historii do schowka
- Drukowanie zbiorówki z historii
- Wyszukiwanie po dacie, numerze sesji, nazwie produktu, kodzie
- Usuwanie pojedynczych sesji lub całej historii
- Synchronizacja z Supabase (backend)

### Baza produktów
- Automatyczne zapamiętywanie produktów z zapisanych sesji
- Ręczne dodawanie produktów (nazwa, kod, waga)
- Wyszukiwanie produktów
- Usuwanie produktów z bazy
- Synchronizacja z Supabase

### Interfejs
- Dark/Light mode (toggle suwakowy)
- Responsywny layout (desktop, tablet, mobile)
- Sidebar wysuwany z boku na mobile (hamburger menu)
- Tabele w formacie kart na małych ekranach
- Animacja cząsteczek canvas w logo
- Ikony Lucide SVG (zamiast emoji)
- Animowany pasek hover w nawigacji
- Toast notifications (sukces/błąd)
- Scroll to top w bazie produktów

### Drukowanie
- Dedykowany obszar druku (ukryty div)
- Formatowanie tabel do druku (czarno-białe, z checkboxami)
- Obsługa @media print

## Struktura projektu

```
WagaEX/
├── index.html              # Główny plik HTML
├── main.js                 # Entry point JS (inicjalizacja, event listenery)
├── style.css               # Wszystkie style CSS
├── package.json            # Konfiguracja npm
├── README.md               # Ten plik
├── src/
│   ├── js/
│   │   ├── calculator.js   # Parsowanie danych, obliczenia, renderowanie wyników
│   │   ├── config.js       # Konfiguracja Supabase (URL, klucz)
│   │   ├── state.js        # Zarządzanie stanem aplikacji (AppState)
│   │   ├── storage.js      # Komunikacja z Supabase (CRUD)
│   │   ├── ui.js           # Renderowanie UI (historia, zbiorówka, baza, sesja)
│   │   └── utils.js        # Funkcje pomocnicze (escape HTML, toast, agregacja)
│   └── images/
│       └── polygon.png     # Favicon
```

## Technologie

- **Frontend:** Vanilla JavaScript (ES Modules), HTML5, CSS3
- **Backend:** Supabase (PostgreSQL + REST API)
- **Fonty:** IBM Plex Sans, IBM Plex Mono (Google Fonts)
- **Ikony:** Lucide Icons (inline SVG)
- **Bez build toola** — działa bezpośrednio w przeglądarce

## Baza danych (Supabase)

### Tabela `products`
| Kolumna | Typ | Opis |
|---------|-----|------|
| id | text | PK (nazwa lowercase) |
| nazwa | text | Nazwa produktu |
| kod | text | Kod produktu |
| waga | float8 | Waga jednostkowa (kg) |
| ostatnio_uzyta | timestamptz | Data ostatniego użycia |

### Tabela `sessions`
| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid | PK |
| nr | int4 | Numer sesji |
| data | timestamptz | Data zapisania |
| total_kg | float8 | Łączna waga |

### Tabela `norms`
| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid | PK |
| session_id | uuid | FK → sessions.id |
| nr | int4 | Numer normy w sesji |
| label | text | Etykieta (np. "Norma 1") |
| total_kg | float8 | Waga normy |

### Tabela `norm_products`
| Kolumna | Typ | Opis |
|---------|-----|------|
| id | int8 | PK (auto) |
| norm_id | uuid | FK → norms.id |
| nazwa | text | Nazwa produktu |
| kod | text | Kod produktu |
| waga | float8 | Waga jednostkowa |
| ilosc | int4 | Ilość oryginalna |
| ilosc_x | int4 | Ilość po mnożniku |

## Uruchomienie

1. Otwórz `index.html` w przeglądarce (lub użyj Live Server)
2. Aplikacja łączy się z Supabase automatycznie
3. Dane są synchronizowane między localStorage a backendem

## Format danych wejściowych

Kalkulator akceptuje dane skopiowane z Excela w formacie:
```
Nazwa produktu Kod 2.5kg	4
Odkurzacz piorący 20L Kaminer 23918 3kg	2
Zestaw ogrodowy G01234 25kg	1
```

Rozpoznawane wzorce kodów:
- Alfanumeryczne: G66119, EGW102, PH-201, M57692A
- Numeryczne (min 4 cyfry): 23190, 22621

## Autor

Projekt WagaEX — narzędzie do zarządzania wagą zamówień eksportowych.
