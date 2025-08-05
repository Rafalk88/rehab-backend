import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt';

const prisma = new PrismaClient();

export const registerUser = async (req: Request, res: Response) => {
  const { first_name, surname, sex_id, organizational_unit_id, password } = req.body;

  try {
    // 🔍 1. Imię
    let firstNameEntry = await prisma.givenName.findFirst({
      where: { first_name },
    });
    if (!firstNameEntry) {
      firstNameEntry = await prisma.givenName.create({ data: { first_name } });
    }

    // 🔍 2. Nazwisko
    let surnameEntry = await prisma.surname.findFirst({
      where: { surname },
    });
    if (!surnameEntry) {
      surnameEntry = await prisma.surname.create({ data: { surname } });
    }

    // 🧠 3. Generuj login
    const baseLogin = `${first_name[0].toLowerCase()}${surname.toLowerCase()}`;
    let login = baseLogin;
    let suffix = 1;

    while (await prisma.user.findUnique({ where: { login } })) {
      login = `${baseLogin}${suffix}`;
      suffix++;
    }

    // 📧 4. Generuj email jeśli nie podany
    const finalEmail = `${login}@vitala.com`;

    // 🔐 5. Hash hasła
    const passwordHash = await bcrypt.hash(password, 10);

    // 🧑‍💼 6. Stwórz użytkownika
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

    res.status(201).json({ message: 'User created', userId: user.id, login });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'User registration failed' });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  const { login, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { login } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });

    const token = generateToken({ userId: user.id });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Login error' });
  }
};

export const logoutUser = async (req: Request, res: Response) => {};

export const deleteUser = async (req: Request, res: Response) => {};

export const modifyUser = async (req: Request, res: Response) => {};
