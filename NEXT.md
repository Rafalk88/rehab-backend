# NEXT

> Jedna rzecz naraz. Na górze zawsze to, co robię w najbliższej sesji.
> Ostatnia aktualizacja: 2026-11-03

## Teraz (najbliższa sesja, blok 1 h)

**Zadanie:** domknąć poprawkę audytu i posprzątać po niej: test unit, commit, usunięcie ręcznego `newValues` i uprawnień `*.delete`
**Gałąź:** `fix/audit-old-values` (od świeżego `main`; jeśli poprawka jest już na innej gałęzi, zostań na niej)
**Zrobione, gdy:** `pnpm test:unit` zielone z nowym `audit.extension.spec.ts`, poprawka i testy w commitach, w kodzie nie ma `*.delete` ani ręcznego `newValues` w `visits.service.ts`, zmiana statusu wizyty nadal daje w audycie `oldValues` i `newValues`.

- [ ] (0–10 min) Jeśli jeszcze nie ma: `audit.extension.spec.ts` z `findOld` (gotowy w `rehab/`), `pnpm test:unit`, commit `fix(audit): load old record via client instead of query()`
- [ ] (10–25 min) Nauka, kawałki 5 i 6: odczyt starego rekordu przez `this.visit.findUnique` (dlaczego `findOld` jest parametrem, dlaczego `this` się nie zapętla) oraz daty i `!==`. Potem usunąć TODO z kodu
- [ ] (25–35 min) `visits.service.ts`: usunąć ręczne `newValues: { status }` z `withAudit`, zmienić status, sprawdzić wpis w audycie
- [ ] (35–55 min) Usunąć `*.delete` z `PERMISSIONS`, poprawić miejsca wskazane przez kompilator, `pnpm build`, `pnpm seed`, jedno zdanie w DECISIONS: „brak ręcznego usuwania, dane usuwa retencja”
- [ ] (55–60 min) `pnpm test:unit`, commit, aktualizacja NEXT

## Kolejka (po kolei, nie skacz)

1. [ ] Audyt, reszta drobiazgów po poprawce z 02.11: `updateMany` / `deleteMany` nie są audytowane; ewentualnie `oldValues` w `meta` contextu
   - `entityId` w audycie jest `Json`, a to zawsze UUID: zmienić na `String?` (migracja, np. `USING entity_id #>> '{}'`). Prisma Studio pokazuje przy nim „Value must be valid Json”, choć dane są poprawne
   - Sprawdzić, czy usunięcie przez retencję zostawia ślad (kto/co/kiedy). Jeśli idzie przez Prismę `deleteMany`, extension go nie audytuje; jeśli przez bazę, potrzebny log po stronie bazy
2. [ ] Test audytu, reszta (poza poniedziałkowym update pacjenta): create, wizyty, osobna baza testowa uruchamiana w CI
3. [ ] Porządki w seedzie (ok. 30 min, z review 31.10)
   - `seedUserRoles` szuka po `loginMasked`, a powinien po `loginHmac` (maska nie musi być unikalna)
   - `seedVisits` robi `create`, więc każdy seed dubluje wizyty: przejść na `upsert` albo sprawdzać istnienie
   - zmienna `male` dla `'kobieta'`: zmienić nazwę
   - status wizyty `as any` zamiast enuma `VisitStatus`
4. [ ] Maskowanie PESEL w odpowiedziach API
5. [ ] README: usunąć placeholdery „YYYY-MM-DD”, dodać screeny
6. [ ] CI w GitHub Actions (lint + testy)
7. [ ] Deploy demo: konto dla każdej roli, fikcyjne dane, reset bazy
8. [ ] CRUD gabinetu (minimalny, tylko tyle, ile potrzebuje obieg dokumentów)
9. [ ] MVP obiegu dokumentów w dziale rehabilitacji, termin: 15.02.2027
   - Jeden typ dokumentu, który znam z pracy, maks. 3–4 statusy (np. złożony → zaakceptowany → zrealizowany / odrzucony)
   - Zmiana statusu chroniona przez `@Permissions`, każda zmiana w audycie (kto, kiedy, z jakiego na jaki)
   - Wdrożony na demo, z kontem dla każdej roli. Tylko fikcyjne dane (RODO)
   - Bez załączników, powiadomień i drugiego typu dokumentu w MVP
   - Przed startem: 1 strona notatek, jak ten dokument dziś przechodzi

### Pułapki w projekcie (pamiętać)

- Po każdej zmianie schematu: `pnpm prisma:migrate --name ...`, potem `pnpm build`, dopiero potem `pnpm seed`. Aliasy `#...` w `package.json` przy uruchomieniu wskazują na `dist`, więc bez builda seed używa starego klienta.
- Do poprawy przy okazji CI: `prisma.config.ts` wskazuje `./prisma/schema.prisma`, a schemat leży w `src/prisma/`. Rozważyć `"seed": "pnpm build && tsx ..."`.
- Uprawnienia są cache'owane w pamięci przez 1 minutę. Po zmianie w bazie zrestartuj aplikację.
- Dopóki `seedVisits` robi `create`, każdy `pnpm seed` dubluje wizyty. Nie licz wizyt w testach ani przy ręcznym sprawdzaniu po kilku seedach.
- Nowe uprawnienie dodajesz tylko w `PERMISSIONS`: `system.admin` dostaje je automatycznie (`ALL_PERMISSIONS`), audytor tylko, gdy kończy się na `.read`. Seed usuwa z bazy uprawnienia spoza mapy.

## Pomysły na później (nie ruszać przed demo)

- Obieg dokumentów: kolejne typy dokumentów, załączniki, powiadomienia (po MVP z kolejki)
- Rozmowa z działem IT mojego szpitala (30 min, można już teraz): jak dziś krąży dokumentacja, co boli. Pytać, nie obiecywać. Gdy MVP będzie na demo, wrócić do nich z linkiem
- Pytanie domenowe: czy pielęgniarka powinna widzieć listę jednostek organizacyjnych?
- Audyt: ponowna próba zapisu wpisu (`auditCallback`), gdy zapis się nie uda, np. kolejka/outbox. Dziś `catch` tylko loguje. Uwaga: odczytu starego rekordu nie da się powtórzyć po `update`, stan „przed” już nie istnieje
- Retencja: 5 lat to wartość demonstracyjna (pokazuje mechanizm), właściwy okres ustala prawnik/IOD. Przy okazji: okres w konfiguracji (env), a nie w kodzie, i jedno zdanie w DECISIONS/README, że to wartość demo

## Zrobione

| Data        | Co                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-03  | Nauka audytu krok po kroku, kawałki 1–4: czym jest extension Prismy, `params` i `query` (operacja na sztywno, zmieniasz tylko `args`), `where` vs `data`, skrót `{ where }`, dlaczego pusty `catch` jest gorszy niż brak `try/catch`, skąd błąd (migracja z `$use` na `$allOperations`)                                                                                                                                                                                                               |
| 2026-11-02  | Błąd audytu znaleziony i poprawiony: `oldValues` było `null`, bo `query({ action: 'findUnique' })` robił `update`, a pusty `catch` to chował. Odczyt przez `findOld` na kliencie, diff przez `JSON.stringify`. Sprawdzone na bazie: `IN_PROGRESS` → `COMPLETED`. Nowy `audit.extension.spec.ts` (stare testy mockowały zachowanie `$use`). Decyzja: delete odpada, dane usuwa retencja                                                                                                                |
| 2026-10-31  | Refaktor uprawnień: `PERMISSIONS` z `as const` jako jedno źródło prawdy, typ `Permission`, `ALL_PERMISSIONS`, `CREATE` zamiast `WRITE`, `users.reset_password`. Dekorator `@Permissions(...permissions: Permission[])`, guard na `Reflector.getAllAndOverride` sprawdza każde uprawnienie osobno, test ręczny `GET /organizational-units` zgodny z rolą. Seed: admin = wszystkie, audytor = `.read`, usuwanie uprawnień spoza mapy. Testy guarda na mocku `Reflector` + test wielu uprawnień, zielone |
| 2026-10-30  | RBAC deny by default: guard zwraca 403 bez `@Permissions`, uprawnienia na trasach pacjentów, wizyt i jednostek, konwencja nazw z kropką, seed uprawnień ról z `@@unique`, użytkownik `tnurse`, test ręczny 200/403, ADR 020, PR do `main`                                                                                                                                                                                                                                                             |
| przed 26.10 | DECISIONS.md, linki, tabelka wersji dokumentacji                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
