import { authService } from '@services/auth/authService';
import type { RegisterUserSchema, LoginUserSchema } from './authSchemas';
import { Request, Response, NextFunction } from 'express';

const registerUser = async (
  req: Request<unknown, unknown, RegisterUserSchema>,
  res: Response,
  next: NextFunction
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

const loginUser = async (
  req: Request<unknown, unknown, LoginUserSchema>,
  res: Response,
  next: NextFunction
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
