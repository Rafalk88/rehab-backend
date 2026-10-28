# NEXT

> Jedna rzecz naraz. Na górze zawsze to, co robię w najbliższej sesji.
> Ostatnia aktualizacja: 2026-10-28

## Teraz (najbliższa sesja)

**Zadanie:** RBAC deny by default, część 2: uprawnienia dla tras
**Gałąź:** `fix/rbac-deny-by-default`
**Zrobione, gdy:** wszystkie trasy za `AuthorizationGuard` mają `@Permissions`, a `pnpm test:unit` jest zielony.

- [ ] Dodać `@Permissions` do tras z listy poniżej
- [ ] Dopisać uprawnienia do seeda i przypisać je rolom
- [ ] Naprawić testy, które się wysypały (lista poniżej)
- [ ] ADR w DECISIONS.md: „Deny by default w AuthorizationGuard” (dlaczego: zapomniany dekorator = wyciek PESEL; jawny dekorator czytelniejszy niż wyjątek w guardzie)

### Trasy do oznaczenia

Trasy za `AuthorizationGuard` bez `@Permissions` (stan z 28.10). Po zmianie guarda zwracają 403 dla wszystkich.

| Trasa | Metoda w kontrolerze | Proponowane uprawnienie |
|---|---|---|
| `GET /patients` | `PatientsController.findAll` | `patients.read` |
| `GET /patients/:id` | `PatientsController.findOne` | `patients.read` |
| `POST /patients` | `PatientsController.create` | `patients.create` |
| `GET /visits` | `VisitsController` (GET) | `visits.read` |
| `POST /visits` | `VisitsController` (POST) | `visits.create` |
| `PATCH /visits/:id/status` | `VisitsController` (PATCH status) | `visits.update_status` |
| `PATCH /visits/:id` | `VisitsController` (PATCH) | `visits.update` |
| `GET /organizational-units` | `OrganizationalUnitsController` (GET) | `org_units.read` |

Bez zmian: `logout` i `change-password` mają tylko `JwtAuthGuard`, a `login`, `refresh-token` i `health` nie mają guarda. `@AuthenticatedOnly()` jest potrzebny dopiero wtedy, gdy pojawi się trasa za `AuthorizationGuard` dostępna dla każdego zalogowanego.

Uwaga: w kodzie są dwie konwencje nazw (`register.user` z kropką i `roles_assign` z podkreślnikiem). Wybierz jedną i zapisz ją w ADR.

### Testy, które się wysypały

_(uzupełnić po `pnpm test:unit`)_

- 

## Kolejka (po kolei, nie skacz)

1. [ ] Test audytu na prawdziwej bazie (czy zapisuje stare wartości)
2. [ ] Maskowanie PESEL w odpowiedziach API
3. [ ] README: usunąć placeholdery „YYYY-MM-DD”, dodać screeny
4. [ ] CI w GitHub Actions (lint + testy)
5. [ ] Deploy demo: konto dla każdej roli, fikcyjne dane, reset bazy
6. [ ] CRUD gabinetu

## Pomysły na później (nie ruszać przed demo)

- 

## Zrobione

| Data | Co |
|---|---|
| 2026-10-28 | Guard: brak `@Permissions` = 403 (deny by default) |
| przed 26.10 | DECISIONS.md, linki, tabelka wersji dokumentacji |
