# Requirements Document

## Introduction

Funkcjonalność ręcznego dodawania produktów do "Bazy produktów" w aplikacji WagaEX. Obecnie baza jest uzupełniana wyłącznie automatycznie podczas zapisywania sesji. Użytkownik potrzebuje możliwości ręcznego dodania produktu z poziomu zakładki "Baza produktów", podając co najmniej nazwę i wagę.

## Glossary

- **System**: Aplikacja WagaEX (kalkulator magazynowy SPA)
- **Baza_Produktów**: Zakładka i magazyn danych przechowujący produkty w tabeli Supabase `products`
- **Formularz_Dodawania**: Interfejs UI umożliwiający ręczne wprowadzenie danych nowego produktu
- **Produkt**: Rekord w bazie zawierający: id, nazwa, kod, waga, ostatnioUzyta, lacznaIlosc
- **StorageManager**: Klasa odpowiedzialna za zapis/odczyt danych z Supabase

## Requirements

### Requirement 1: Wyświetlenie formularza dodawania produktu

**User Story:** Jako magazynier, chcę mieć dostępny formularz dodawania produktu w zakładce "Baza produktów", abym mógł ręcznie wprowadzić nowy produkt bez konieczności tworzenia sesji.

#### Acceptance Criteria

1. THE System SHALL display a Formularz_Dodawania in the "Baza produktów" tab containing input fields for: nazwa (text, maximum 100 characters), kod (text, maximum 50 characters), and waga (number in kg, accepting values from 0.01 to 9999.99)
2. THE Formularz_Dodawania SHALL mark the nazwa field and waga field as required
3. THE Formularz_Dodawania SHALL mark the kod field as optional
4. THE Formularz_Dodawania SHALL include a submit button labeled "Dodaj produkt"
5. WHEN the user clicks "Dodaj produkt" and both nazwa and waga contain valid values, THE System SHALL add the product to the Baza produktów, clear the form fields, and display a confirmation message indicating the product was added
6. IF the user clicks "Dodaj produkt" and the nazwa field is empty or the waga field is empty or waga is outside the range 0.01–9999.99, THEN THE System SHALL display an error message indicating which fields require correction and SHALL NOT add the product to the Baza produktów
7. IF the user submits a product with a nazwa that already exists in the Baza produktów (case-insensitive match), THEN THE System SHALL update the existing product's waga with the new value instead of creating a duplicate entry

### Requirement 2: Walidacja danych wejściowych

**User Story:** Jako magazynier, chcę aby system walidował dane przed zapisem, abym nie wprowadził nieprawidłowych wartości do bazy.

#### Acceptance Criteria

1. WHEN the user submits the Formularz_Dodawania with an empty nazwa field or a nazwa containing only whitespace, THE System SHALL display a validation error message and prevent submission
2. WHEN the user submits the Formularz_Dodawania with an empty or zero waga field, THE System SHALL display a validation error message and prevent submission
3. WHEN the user submits the Formularz_Dodawania with a waga value that is not a positive number (contains non-numeric characters other than a single comma or dot as decimal separator), THE System SHALL display a validation error message and prevent submission
4. WHEN the user enters a nazwa value, THE System SHALL trim whitespace from the beginning and end of the value before processing
5. WHEN the user submits the Formularz_Dodawania with a nazwa exceeding 100 characters after trimming, THE System SHALL display a validation error message indicating the name is too long

### Requirement 3: Zapis produktu do bazy

**User Story:** Jako magazynier, chcę aby ręcznie dodany produkt był zapisywany w Supabase, abym mógł go później odnaleźć i wykorzystać w sesjach.

#### Acceptance Criteria

1. WHEN the user submits a valid Formularz_Dodawania, THE System SHALL create a new Produkt record with id equal to nazwa.toLowerCase().trim() with internal whitespace collapsed to single spaces
2. WHEN the user submits a valid Formularz_Dodawania, THE System SHALL set the ostatnioUzyta field to the current date and time in ISO 8601 format
3. WHEN the user submits a valid Formularz_Dodawania, THE System SHALL set the lacznaIlosc field to 0 in the in-memory Produkt object
4. WHEN the user submits a valid Formularz_Dodawania, THE StorageManager SHALL persist the Produkt to the Supabase products table by calling upsert with fields: id, nazwa, kod, waga, ostatnio_uzyta
5. IF a Produkt with the same id already exists in Baza_Produktów, THEN THE System SHALL update the existing record with the new nazwa, kod, waga, and ostatnioUzyta values
6. WHEN the user submits a valid Formularz_Dodawania, THE System SHALL store the waga value as a number with up to 2 decimal places

### Requirement 4: Informacja zwrotna po zapisie

**User Story:** Jako magazynier, chcę otrzymać potwierdzenie dodania produktu, abym wiedział że operacja się powiodła.

#### Acceptance Criteria

1. WHEN the Produkt is successfully saved to Baza_Produktów, THE System SHALL display a toast notification with a message indicating that the product was added successfully, and the toast SHALL automatically disappear after 3 seconds
2. WHEN the Produkt is successfully saved, THE System SHALL clear all input fields in the Formularz_Dodawania
3. WHEN the Produkt is successfully saved, THE System SHALL re-render the product list in Baza_Produktów so that the newly added Produkt is visible without requiring a manual page refresh
4. WHEN the Produkt is successfully saved, THE System SHALL update the Baza_Produktów badge counter to reflect the current total number of products stored in the database
5. IF the save operation fails due to a storage error, THEN THE System SHALL display a toast error notification indicating that the save failed, and the toast SHALL automatically disappear after 3 seconds
6. IF the save operation fails, THEN THE System SHALL preserve all user-entered data in the Formularz_Dodawania so the user can retry without re-entering information

### Requirement 5: Obsługa wagi w formacie polskim

**User Story:** Jako magazynier, chcę móc wpisać wagę używając przecinka jako separatora dziesiętnego, ponieważ jest to standard w Polsce.

#### Acceptance Criteria

1. WHEN the user enters a waga value using a comma as decimal separator (e.g. "2,5"), THE System SHALL convert the comma to a decimal point and use the resulting numeric value (e.g. 2.5) in all processing
2. WHEN the user enters a waga value using a dot as decimal separator (e.g. "2.5"), THE System SHALL use the dot as a decimal point and use the resulting numeric value in all processing
3. WHEN the user enters a waga value with more than one comma or dot (e.g. "2,,5", "2.5.3"), THE System SHALL treat the input as invalid and display an error message
4. THE System SHALL accept waga values in the range from 0.01 to 9999.99 kg with a maximum of 2 decimal places
