import { authService } from '@/old code/services/auth/v1/auth.service.js';
import type { RegisterUserSchema, LoginUserSchema } from './auth.schemas.js';
import { Request, Response, NextFunction } from 'express';

/**
 * Rejestruje nowego użytkownika.
 *
 * @param req - Żądanie HTTP z danymi rejestracyjnymi użytkownika w body.
 * @param res - Odpowiedź HTTP, wysyłająca potwierdzenie i ID nowego użytkownika.
 * @param next - Funkcja do przekazywania błędów dalej do middleware błędów.
 *
 * @throws Rzuca błędy jeśli rejestracja się nie powiedzie (np. walidacja, DB).
 */
const registerUser = async (
  req: Request<unknown, unknown, RegisterUserSchema>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { firstName, surname, sexId, organizationalUnitId, password } = req.body;
    const { user, login } = await authService.registerUser({
      firstName,
      surname,
      sexId,
      organizationalUnitId,
      password,
    });

    res.status(201).json({ message: 'User created', userId: user.id, login });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Loguje użytkownika i zwraca token JWT.
 *
 * @param req - Żądanie HTTP z danymi logowania (login, password) w body.
 * @param res - Odpowiedź HTTP z tokenem JWT w formacie JSON.
 * @param next - Funkcja do przekazywania błędów dalej do middleware błędów.
 *
 * @throws Rzuca błędy jeśli logowanie się nie powiedzie (np. złe hasło).
 */
const loginUser = async (
  req: Request<unknown, unknown, LoginUserSchema>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { login, password } = req.body;
    const token = await authService.loginUser(login, password);
    res.json({ token });
  } catch (error: any) {
    next(error);
  }
};

export const authController = {
  registerUser,
  loginUser,
};
