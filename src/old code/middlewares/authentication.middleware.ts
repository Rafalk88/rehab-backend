import type { NextFunction, Request, Response } from 'express';
import { AppError } from '@errors/app.error';
import { verifyToken } from '@/utils/jwt.util';

/**
 * Middleware uwierzytelniający użytkownika na podstawie tokenu JWT.
 *
 * - Wymaga nagłówka `Authorization: Bearer <token>`.
 * - W przypadku braku lub niepoprawności tokenu zgłasza błąd `AppError` z kodem 401.
 * - Po poprawnej weryfikacji ustawia `req.session.userId`.
 *
 * @param request Obiekt żądania Express.
 * @param response Obiekt odpowiedzi Express.
 * @param _next Funkcja wywołania kolejnego middleware.
 */
export const authentication = (request: Request, response: Response, _next: NextFunction) => {
  if (request.method === 'OPTIONS')
    return response.send({ message: 'Preflight check successful.' });

  const authHeader = request.headers.authorization;
  if (!authHeader) {
    return _next(new AppError('unauthorized', '`Authorization` header is required.'));
  }

  if (!authHeader.startsWith('Bearer ')) {
    return _next(new AppError('unauthorized', 'Invalid access token.'));
  }

  const token = authHeader.split(' ')[1]?.trim();
  if (!token) {
    return _next(new AppError('unauthorized', 'Invalid access token.'));
  }

  try {
    request['session'] = { userId: verifyToken(token) };
    _next();
  } catch {
    return _next(new AppError('validation', 'Invalid access token.'));
  }
};
