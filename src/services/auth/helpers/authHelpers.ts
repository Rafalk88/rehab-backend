import { AppError } from '@utils/utilityClasses';
import { verifyPassword } from '@/utils/password';
import prisma from '@config/prismaClient';
import type { User, PrismaClient } from '@prisma/client';

/**
 * Maksymalna liczba nieudanych prób logowania przed zablokowaniem konta.
 */
const MAX_FAILED_ATTEMPTS = 5;

/**
 * Czas trwania blokady konta w minutach po przekroczeniu maksymalnej liczby nieudanych prób.
 */
const LOCK_DURATION_MINUTES = 15;

/**
 * Weryfikuje poprawność hasła użytkownika.
 *
 * Jeśli hasło jest niepoprawne:
 * - inkrementuje licznik nieudanych prób logowania,
 * - jeśli liczba prób przekroczy limit, blokuje konto i rzuca błąd z informacją o blokadzie,
 * - w przeciwnym razie rzuca błąd o niepoprawnych danych logowania.
 *
 * @param user - obiekt zawierający id użytkownika, hash hasła i liczbę nieudanych prób
 * @param password - hasło do weryfikacji
 * @param prismaInstance - instancja Prisma do operacji na bazie danych (opcjonalnie)
 *
 * @throws {AppError} unauthorized lub forbidden w zależności od sytuacji
 */
export const verifyLoginCredentials = async (
  user: {
    id: User['id'];
    failedLoginAttempts: User['failedLoginAttempts'];
    passwordHash: User['passwordHash'];
  },
  password: string,
  prismaInstance: PrismaClient = prisma
) => {
  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    const { failedAttempts, lockedUntil } = await updateLoginFailure(
      user.id,
      prismaInstance
    );

    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      throw new AppError(
        'forbidden',
        `Account locked until ${lockedUntil?.toISOString()}`
      );
    }

    throw new AppError('unauthorized', 'Invalid login or password');
  }
};

/**
 * Sprawdza dodatkowe ograniczenia logowania dla użytkownika.
 *
 * Rzuca odpowiedni błąd jeśli:
 * - konto jest nieaktywne,
 * - konto jest zablokowane (z uwzględnieniem czasu blokady),
 * - użytkownik musi zmienić hasło przed zalogowaniem.
 *
 * @param user - obiekt zawierający status konta i flagę wymuszenia zmiany hasła
 *
 * @throws {AppError} forbidden z odpowiednim komunikatem w przypadku naruszenia zasad
 */
export const checkLoginRestrictions = (user: {
  isActive: User['isActive'];
  isLocked: User['isLocked'];
  lockedUntil: User['lockedUntil'];
  mustChangePassword: User['mustChangePassword'];
}) => {
  if (!user.isActive) {
    throw new AppError('forbidden', 'Account is inactive');
  }

  if (user.isLocked) {
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const formattedDate = user.lockedUntil.toLocaleString('pl-PL', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
      throw new AppError('forbidden', `Account locked until ${formattedDate}`);
    }
    throw new AppError('forbidden', 'Account is locked');
  }

  if (user.mustChangePassword) {
    throw new AppError('forbidden', 'Password change required before login');
  }
};

/**
 * Aktualizuje dane użytkownika po pomyślnym zalogowaniu:
 * - resetuje licznik nieudanych prób logowania,
 * - odblokowuje konto,
 * - ustawia datę ostatniego logowania na teraz.
 *
 * @param id - identyfikator użytkownika
 * @param prismaInstance - instancja Prisma do operacji na bazie danych (opcjonalnie)
 */
export const updateLoginSuccess = async (
  id: User['id'],
  prismaInstance: PrismaClient = prisma
) => {
  await prismaInstance.user.update({
    where: { id },
    data: {
      lastLoginAt: new Date(),
      failedLoginAttempts: 0,
      isLocked: false,
      lockedUntil: null,
    },
  });
};

/**
 * Aktualizuje stan użytkownika po nieudanej próbie logowania:
 * - inkrementuje licznik nieudanych prób,
 * - ustawia czas ostatniej nieudanej próby na teraz,
 * - jeśli liczba prób przekroczy limit, blokuje konto na określony czas.
 *
 * @param id - identyfikator użytkownika
 * @param prismaInstance - instancja Prisma do operacji na bazie danych (opcjonalnie)
 * @returns obiekt z aktualną liczbą nieudanych prób i ewentualnym czasem blokady
 */
export const updateLoginFailure = async (
  id: User['id'],
  prismaInstance: PrismaClient = prisma
) => {
  const updated = await prismaInstance.user.update({
    where: { id },
    data: {
      failedLoginAttempts: { increment: 1 },
      lastFailedLoginAt: new Date(),
    },
    select: { failedLoginAttempts: true },
  });

  const failedAttempts = updated.failedLoginAttempts ?? 0;
  let lockedUntil: Date | undefined;

  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);

    // ustawienie blokady
    await prismaInstance.user.update({
      where: { id },
      data: {
        isLocked: true,
        lockedUntil,
      },
    });
  }

  return { failedAttempts, lockedUntil };
};

/**
 * Pobiera istniejący rekord imienia z bazy lub tworzy nowy,
 * po normalizacji (trim i lowercase) podanego imienia.
 *
 * @param firstName - imię do wyszukania lub dodania
 * @param prismaInstance - instancja Prisma do operacji na bazie danych (opcjonalnie)
 * @returns obiekt rekordu imienia z bazy danych
 */
export const getOrCreateFirstName = async (
  firstName: string,
  prismaInstance = prisma
) => {
  const normalizedFirstName = firstName.trim().toLowerCase();
  let firstNameEntry = await prismaInstance.givenName.findFirst({
    where: { firstName: normalizedFirstName },
  });
  if (!firstNameEntry) {
    firstNameEntry = await prismaInstance.givenName.create({
      data: { firstName: normalizedFirstName },
    });
  }
  return firstNameEntry;
};

/**
 * Pobiera istniejący rekord nazwiska z bazy lub tworzy nowy,
 * po normalizacji (trim i lowercase) podanego nazwiska.
 *
 * @param surname - nazwisko do wyszukania lub dodania
 * @param prismaInstance - instancja Prisma do operacji na bazie danych (opcjonalnie)
 * @returns obiekt rekordu nazwiska z bazy danych
 */
export const getOrCreateSurname = async (surname: string, prismaInstance = prisma) => {
  const normalizedSurname = surname.trim().toLowerCase();
  let surnameEntry = await prismaInstance.surname.findFirst({
    where: { surname: normalizedSurname },
  });
  if (!surnameEntry) {
    surnameEntry = await prismaInstance.surname.create({
      data: { surname: normalizedSurname },
    });
  }
  return surnameEntry;
};

/**
 * Generuje unikalny login na podstawie pierwszej litery imienia i pełnego nazwiska.
 * Jeśli login jest już zajęty, dopisuje rosnący sufiks liczbowy, aż znajdzie unikalny.
 *
 * @param firstName - imię użytkownika
 * @param surname - nazwisko użytkownika
 * @param prismaInstance - instancja Prisma do operacji na bazie danych (opcjonalnie)
 * @returns unikalny login jako string
 */
export const generateUniqueLogin = async (
  firstName: string,
  surname: string,
  prismaInstance = prisma
) => {
  const baseLogin = `${firstName[0]?.trim().toLowerCase()}${surname
    .trim()
    .toLowerCase()}`;
  let login = baseLogin;
  let suffix = 1;

  while (await prismaInstance.user.findUnique({ where: { login } })) {
    login = `${baseLogin}${suffix}`;
    suffix++;
  }
  return login;
};
