import { prisma } from '@config/prismaClient';
import { hashPassword, verifyPassword } from '@utils/password';
import { generateToken } from '@utils/jwt';

const registerUser = async (userData: {
  firstName: string;
  surname: string;
  sexId?: string;
  organizationalUnitId?: string;
  password: string;
}) => {
  const { firstName, surname, sexId, organizationalUnitId, password } = userData;

  let firstNameEntry = await prisma.givenName.findFirst({ where: { firstName } });
  if (!firstNameEntry) {
    firstNameEntry = await prisma.givenName.create({ data: { firstName } });
  }

  let surnameEntry = await prisma.surname.findFirst({ where: { surname } });
  if (!surnameEntry) {
    surnameEntry = await prisma.surname.create({ data: { surname } });
  }

  const baseLogin = `${firstName[0]?.toLowerCase()}${surname.toLowerCase()}`;
  let login = baseLogin;
  let suffix = 1;

  while (await prisma.user.findUnique({ where: { login } })) {
    login = `${baseLogin}${suffix}`;
    suffix++;
  }

  const finalEmail = `${login}@vitala.com`;
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      login,
      email: finalEmail,
      passwordHash: passwordHash,
      firstNameId: firstNameEntry.id,
      surnameId: surnameEntry.id,
      sexId: sexId ?? null,
      organizationalUnitId: organizationalUnitId ?? null,
      mustChangePassword: true,
    },
  });

  return { user, login };
};

const loginUser = async (login: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { login } });
  if (!user) throw new Error('User not found');

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw new Error('Invalid password');

  const token = generateToken({ userId: user.id });
  return token;
};

export const authService = {
  registerUser,
  loginUser,
};
