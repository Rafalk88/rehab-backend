# NEXT

> Jedna rzecz naraz. Na górze zawsze to, co robię w najbliższej sesji.
> Ostatnia aktualizacja: 2026-10-28

## Teraz (najbliższa sesja)

**Zadanie:** domknąć RBAC deny by default i wypchnąć
**Gałąź:** `fix/rbac-patients-visits`
**Zrobione, gdy:** gałąź jest zmergowana do `main`, a zalogowany użytkownik z właściwą rolą widzi pacjentów, bez tej roli dostaje 403.

- [x] Guard: brak `@Permissions` = 403, test guarda zielony
- [x] `@Permissions` na trasach pacjentów, wizyt i jednostek organizacyjnych
- [x] Konwencja nazw uprawnień: kropki wszędzie
- [ ] Seed: nowe uprawnienia są w bazie i przypisane rolom (inaczej wszyscy dostaną 403)
- [ ] Test ręczny: zaloguj się dwiema rolami i sprawdź `GET /patients` (200 vs 403)
- [ ] ADR w DECISIONS.md: „Deny by default w AuthorizationGuard” (dlaczego: zapomniany dekorator = wyciek PESEL; jawny dekorator czytelniejszy niż wyjątek w guardzie; konwencja nazw z kropką)
- [ ] Push gałęzi, PR do `main` z opisem „co / dlaczego / jak przetestowałem”, merge

## Kolejka (po kolei, nie skacz)

1. [ ] Refaktor: stałe `PERMISSIONS` jako jedno źródło prawdy (typ `Permission` w dekoratorze, seed z `Object.values`). Konwencja nazw już ujednolicona. Osobna gałąź `refactor/permissions-constants`
2. [ ] Test audytu na prawdziwej bazie (czy zapisuje stare wartości)
3. [ ] Maskowanie PESEL w odpowiedziach API
4. [ ] README: usunąć placeholdery „YYYY-MM-DD”, dodać screeny
5. [ ] CI w GitHub Actions (lint + testy)
6. [ ] Deploy demo: konto dla każdej roli, fikcyjne dane, reset bazy
7. [ ] CRUD gabinetu

## Pomysły na później (nie ruszać przed demo)

-

## Zrobione

## Zrobione

| Data        | Co                                                  |
| ----------- | --------------------------------------------------- |
| 2026-10-28  | Guard: brak `@Permissions` = 403 (deny by default), |
|             | uprawnienia na trasach pacjentów, wizyt i           |
|             | jednostek, konwencja nazw z kropką                  |
| przed 26.10 | DECISIONS.md, linki, tabelka wersji dokumentacji    |
