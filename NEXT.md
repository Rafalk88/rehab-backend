# NEXT

> Jedna rzecz naraz. Na górze zawsze to, co robię w najbliższej sesji.
> Ostatnia aktualizacja: 2026-10-31

## Teraz (poniedziałek 2026-11-02, blok 1 h)

**Zadanie:** test audytu na prawdziwej bazie: edycja pacjenta zapisuje stare i nowe wartości
**Gałąź:** `test/audit-integration` (od świeżego `main`)
**Zrobione, gdy:** jeden test integracyjny (update pacjenta → wpis w audycie ze starą i nową wartością) przechodzi na prawdziwej bazie albo czerwienią pokazuje konkretny błąd audytu, zapisany w kolejce. `pnpm test:unit` nadal zielone.

- [ ] (0–5 min) Jeśli PR `refactor/permissions-constants` nie jest jeszcze zmergowany: merge, `git checkout main && git pull`, nowa gałąź
- [ ] (5–20 min) Rozpoznanie: gdzie powstaje wpis audytu (middleware/extension Prismy czy serwis), czy jest konfiguracja testów integracyjnych i osobna baza testowa (`.env.test`, `DATABASE_URL`)
- [ ] (20–45 min) Jeden test: utwórz pacjenta, zmień jedno pole, odczytaj wpis audytu, sprawdź stare i nowe wartości. **Plan B:** jeśli w 30. minucie nie ma działającego połączenia z bazą testową, sprawdzić to ręcznie (`curl` PATCH + `SELECT` z tabeli audytu), zapisać wynik, a test automatyczny zostaje w kolejce
- [ ] (45–55 min) Jeśli zostanie czas: drugi przypadek w tym samym teście (delete zapisuje stare wartości)
- [ ] (55–60 min) `pnpm test:unit`, commit `test(audit): update stores old and new values`, aktualizacja NEXT

## Kolejka (po kolei, nie skacz)

1. [ ] Test audytu, reszta (poza poniedziałkowym update pacjenta): create, delete (jeśli nie wejdzie w poniedziałek), wizyty, osobna baza testowa uruchamiana w CI
2. [ ] Porządki w seedzie (ok. 30 min, z review 31.10)
   - `seedUserRoles` szuka po `loginMasked`, a powinien po `loginHmac` (maska nie musi być unikalna)
   - `seedVisits` robi `create`, więc każdy seed dubluje wizyty: przejść na `upsert` albo sprawdzać istnienie
   - zmienna `male` dla `'kobieta'`: zmienić nazwę
   - status wizyty `as any` zamiast enuma `VisitStatus`
3. [ ] Maskowanie PESEL w odpowiedziach API
4. [ ] README: usunąć placeholdery „YYYY-MM-DD”, dodać screeny
5. [ ] CI w GitHub Actions (lint + testy)
6. [ ] Deploy demo: konto dla każdej roli, fikcyjne dane, reset bazy
7. [ ] CRUD gabinetu (minimalny, tylko tyle, ile potrzebuje obieg dokumentów)
8. [ ] MVP obiegu dokumentów w dziale rehabilitacji, termin: 15.02.2027
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

## Zrobione

| Data        | Co                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-31  | Refaktor uprawnień: `PERMISSIONS` z `as const` jako jedno źródło prawdy, typ `Permission`, `ALL_PERMISSIONS`, `CREATE` zamiast `WRITE`, `users.reset_password`. Dekorator `@Permissions(...permissions: Permission[])`, guard na `Reflector.getAllAndOverride` sprawdza każde uprawnienie osobno, test ręczny `GET /organizational-units` zgodny z rolą. Seed: admin = wszystkie, audytor = `.read`, usuwanie uprawnień spoza mapy. Testy guarda na mocku `Reflector` + test wielu uprawnień, zielone |
| 2026-10-30  | RBAC deny by default: guard zwraca 403 bez `@Permissions`, uprawnienia na trasach pacjentów, wizyt i jednostek, konwencja nazw z kropką, seed uprawnień ról z `@@unique`, użytkownik `tnurse`, test ręczny 200/403, ADR 020, PR do `main`                                                                                                                                                                                                                                                             |
| przed 26.10 | DECISIONS.md, linki, tabelka wersji dokumentacji                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
