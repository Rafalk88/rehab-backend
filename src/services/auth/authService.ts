import { prisma } from '@db/client';
import { hashPassword, verifyPassword } from '@utils/password';
import { generateToken } from '@utils/jwt';

const registerUser = async (userData: {
  first_name: string;
  surname: string;
  sex_id?: string;
  organizational_unit_id?: string;
  password: string;
}) => {
  const { first_name, surname, sex_id, organizational_unit_id, password } = userData;

  let firstNameEntry = await prisma.givenName.findFirst({ where: { first_name } });
  if (!firstNameEntry) {
    firstNameEntry = await prisma.givenName.create({ data: { first_name } });
  }

  let surnameEntry = await prisma.surname.findFirst({ where: { surname } });
  if (!surnameEntry) {
    surnameEntry = await prisma.surname.create({ data: { surname } });
  }

  const baseLogin = `${first_name[0]?.toLowerCase()}${surname.toLowerCase()}`;
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
      password_hash: passwordHash,
      first_name_id: firstNameEntry.id,
      surname_id: surnameEntry.id,
      sex_id,
      organizational_unit_id,
      must_change_password: true,
    },
  });

  return { user, login };
};

const loginUser = async (login: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { login } });
  if (!user) throw new Error('User not found');

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) throw new Error('Invalid password');

  const token = generateToken({ userId: user.id });
  return token;
};

export const authService = {
  registerUser,
  loginUser,
};
