# NEXT

> Jedna rzecz naraz. Na górze zawsze to, co robię w najbliższej sesji.
> Ostatnia aktualizacja: 2026-10-30

## Teraz (najbliższa sesja, blok 1,5 h)

**Zadanie:** refaktor uprawnień, stałe `PERMISSIONS` jako jedno źródło prawdy
**Gałąź:** `refactor/permissions-constants` (od świeżego `main`)
**Zrobione, gdy:** żaden string uprawnienia nie jest wpisany ręcznie w kontrolerach ani w seedzie, literówka w nazwie się nie kompiluje, a `pnpm test:unit` i seed przechodzą.

- [ ] (0–5 min) Jeśli PR `fix/rbac-patients-visits` nie jest jeszcze zmergowany: merge, `git checkout main && git pull`, nowa gałąź
- [ ] (5–25 min) `src/modules/permissions/permissions.constants.ts`: obiekt `PERMISSIONS` z `as const` i typ `Permission`, wszystkie nazwy z kontrolerów i seeda
- [ ] (25–35 min) Dekorator `@Permissions` przyjmuje `Permission` zamiast `string`
- [ ] (35–60 min) Kontrolery: zamiana stringów na `PERMISSIONS.X`. Kompilator pokaże każde miejsce, które zostało
- [ ] (60–75 min) Seed: mapa ról używa `PERMISSIONS.X`, `system.admin` dostaje `Object.values(PERMISSIONS)`
- [ ] (75–90 min) `pnpm build`, `pnpm seed` (liczba uprawnień bez zmian), `pnpm test:unit`, commit `refactor(permissions): single source of truth for permission names`

## Kolejka (po kolei, nie skacz)

1. [ ] Test audytu na prawdziwej bazie (czy zapisuje stare wartości)
2. [ ] Maskowanie PESEL w odpowiedziach API
3. [ ] README: usunąć placeholdery „YYYY-MM-DD”, dodać screeny
4. [ ] CI w GitHub Actions (lint + testy)
5. [ ] Deploy demo: konto dla każdej roli, fikcyjne dane, reset bazy
6. [ ] CRUD gabinetu (minimalny, tylko tyle, ile potrzebuje obieg dokumentów)
7. [ ] MVP obiegu dokumentów w dziale rehabilitacji, termin: 15.02.2027

### Pułapki w projekcie (pamiętać)

- Po każdej zmianie schematu: `pnpm prisma:migrate --name ...`, potem `pnpm build`, dopiero potem `pnpm seed`. Aliasy `#...` w `package.json` przy uruchomieniu wskazują na `dist`, więc bez builda seed używa starego klienta.
- Do poprawy przy okazji CI: `prisma.config.ts` wskazuje `./prisma/schema.prisma`, a schemat leży w `src/prisma/`. Rozważyć `"seed": "pnpm build && tsx ..."`.
- Uprawnienia są cache'owane w pamięci przez 1 minutę. Po zmianie w bazie zrestartuj aplikację.

## Pomysły na później (nie ruszać przed demo)

- Obieg dokumentów: kolejne typy dokumentów, załączniki, powiadomienia (po MVP z kolejki)
- Rozmowa z działem IT mojego szpitala (30 min, można już teraz): jak dziś krąży dokumentacja, co boli. Pytać, nie obiecywać. Gdy MVP będzie na demo, wrócić do nich z linkiem
- Pytanie domenowe: czy pielęgniarka powinna widzieć listę jednostek organizacyjnych?

## Zrobione

| Data        | Co                                                |
| ----------- | ------------------------------------------------- |
| 2026-10-30  | RBAC deny by default: guard zwraca 403 bez        |
|             | `@Permissions`, uprawnienia na trasach pacjentów, |
|             | wizyt i jednostek, konwencja nazw z kropką, seed  |
|             | uprawnień ról z `@@unique`, użytkownik `tnurse`,  |
|             | test ręczny 200/403, ADR 020, PR do `main`        |
| przed 26.10 | DECISIONS.md, linki, tabelka wersji dokumentacji  |
