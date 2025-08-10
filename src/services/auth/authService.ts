import { prisma } from '@config/prismaClient';
import { hashPassword, verifyPassword } from '@utils/password';
import { generateToken } from '@utils/jwt';

async function getOrCreateFirstName(firstName: string, prismaInstance = prisma) {
  let firstNameEntry = await prismaInstance.givenName.findFirst({ where: { firstName } });
  if (!firstNameEntry) {
    firstNameEntry = await prismaInstance.givenName.create({ data: { firstName } });
  }
  return firstNameEntry;
}

async function getOrCreateSurname(surname: string, prismaInstance = prisma) {
  let surnameEntry = await prismaInstance.surname.findFirst({ where: { surname } });
  if (!surnameEntry) {
    surnameEntry = await prismaInstance.surname.create({ data: { surname } });
  }
  return surnameEntry;
}

async function generateUniqueLogin(
  firstName: string,
  surname: string,
  prismaInstance = prisma
) {
  const baseLogin = `${firstName[0]?.toLowerCase()}${surname.toLowerCase()}`;
  let login = baseLogin;
  let suffix = 1;

  while (await prismaInstance.user.findUnique({ where: { login } })) {
    login = `${baseLogin}${suffix}`;
    suffix++;
  }
  return login;
}

const registerUser = async (
  userData: {
    firstName: string;
    surname: string;
    sexId?: string;
    organizationalUnitId?: string;
    password: string;
  },
  prismaInstance = prisma
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

const loginUser = async (login: string, password: string, prismaInstance = prisma) => {
  const user = await prismaInstance.user.findUnique({ where: { login } });
  if (!user) throw new Error('User not found');

  const hasId = await verifyPassword(password, user.passwordHash);
  if (!hasId) throw new Error('Invalid password');

  const token = generateToken({ userId: user.id });
  return token;
};

export const authService = {
  registerUser,
  loginUser,
};
