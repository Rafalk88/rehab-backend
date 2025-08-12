import { prisma } from '@config/prismaClient';
import { hashPassword } from '@/utils/password.util';
import { generateToken } from '@/utils/jwt.util';
import { AppError } from '@errors/app.error';
import {
  getOrCreateFirstName,
  getOrCreateSurname,
  generateUniqueLogin,
  verifyLoginCredentials,
  checkLoginRestrictions,
  updateLoginSuccess,
} from './helpers/auth.helpers';

/**
 * Rejestruje nowego użytkownika w systemie.
 * Tworzy lub pobiera rekordy imienia i nazwiska, generuje unikalny login,
 * hashuje podane hasło oraz tworzy użytkownika w bazie z ustawieniem wymogu zmiany hasła przy pierwszym logowaniu.
 *
 * @param userData - Dane użytkownika do rejestracji (imię, nazwisko, hasło, opcjonalnie sexId i organizationalUnitId).
 * @param prismaInstance - Instancja Prisma do operacji na bazie (domyślnie globalna).
 * @returns Obiekt zawierający nowo utworzonego użytkownika i jego login.
 */
const registerUser = async (
  userData: {
    firstName: string;
    surname: string;
    sexId?: string;
    organizationalUnitId?: string;
    password: string;
  },
  prismaInstance = prisma,
) => {
  const { firstName, surname, sexId, organizationalUnitId, password } = userData;

  const firstNameEntry = await getOrCreateFirstName(firstName, prismaInstance);
  const surnameEntry = await getOrCreateSurname(surname, prismaInstance);
  const login = await generateUniqueLogin(firstName, surname, prismaInstance);
  const email = `${login}@vitala.com`;
  const passwordHash = await hashPassword(password);

  const user = await prismaInstance.user.create({
    data: {
      login,
      email,
      passwordHash,
      firstNameId: firstNameEntry.id,
      surnameId: surnameEntry.id,
      sexId: sexId ?? null,
      organizationalUnitId: organizationalUnitId ?? null,
      mustChangePassword: true,
    },
  });

  return { user, login };
};

/**
 * Autoryzuje użytkownika na podstawie loginu i hasła.
 * Sprawdza, czy użytkownik istnieje, weryfikuje hasło,
 * sprawdza ograniczenia konta (blokada, aktywność, wymóg zmiany hasła),
 * resetuje licznik nieudanych prób przy poprawnym logowaniu,
 * a na końcu generuje token uwierzytelniający.
 *
 * @param login - Login użytkownika.
 * @param password - Podane hasło do weryfikacji.
 * @param prismaInstance - Instancja Prisma do operacji na bazie (domyślnie globalna).
 * @returns Token JWT dla uwierzytelnionego użytkownika.
 * @throws AppError w przypadku niepoprawnych danych lub zablokowanego konta.
 */
const loginUser = async (login: string, password: string, prismaInstance = prisma) => {
  const user = await prismaInstance.user.findUnique({ where: { login } });
  if (!user) {
    throw new AppError('unauthorized', 'Invalid login or password');
  }

  await verifyLoginCredentials(
    {
      id: user.id,
      failedLoginAttempts: user.failedLoginAttempts,
      passwordHash: user.passwordHash,
    },
    password,
    prismaInstance,
  );
  checkLoginRestrictions({
    isActive: user.isActive,
    isLocked: user.isLocked,
    lockedUntil: user.lockedUntil,
    mustChangePassword: user.mustChangePassword,
  });
  await updateLoginSuccess(user.id, prismaInstance);

  return generateToken({ userId: user.id });
};

export const authService = {
  registerUser,
  loginUser,
};
