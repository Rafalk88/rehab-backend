import { authService } from '@services/auth/authService';
import { Request, Response } from 'express';

const registerUser = async (req: Request, res: Response) => {
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
    res.status(500).json({ error: error.message || 'User registration failed' });
  }
};

const loginUser = async (req: Request, res: Response) => {
  try {
    const { login, password } = req.body;
    const token = await authService.loginUser(login, password);
    res.json({ token });
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Login failed' });
  }
};

export const authController = {
  registerUser,
  loginUser,
};
