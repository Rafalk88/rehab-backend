import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AppError } from '@/old code/errors/app.error.js';
import { verifyToken } from '@/lib/jwt.util.js';
import { Request, Response } from 'express';

/**
 * Guard uwierzytelniający użytkownika na podstawie tokenu JWT.
 *
 * - Wymaga nagłówka `Authorization: Bearer <token>`.
 * - W przypadku braku lub niepoprawności tokenu zgłasza błąd `AppError` z kodem 401.
 * - Po poprawnej weryfikacji ustawia `req.session.userId`.
 *
 * @param context Kontekst wykonania (zawiera obiekt żądania/odpowiedzi).
 */
@Injectable()
export class AuthenticationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    if (request.method === 'OPTIONS') {
      response.send({ message: 'Preflight check successful.' });
      return false; // przerwanie obsługi dalszych guardów/kontrolera
    }

    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new AppError('unauthorized', '`Authorization` header is required.');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new AppError('unauthorized', 'Invalid access token.');
    }

    const token = authHeader.split(' ')[1]?.trim();
    if (!token) {
      throw new AppError('unauthorized', 'Invalid access token.');
    }

    try {
      request['session'] = { userId: verifyToken(token) };
      return true; // pozwalamy wejść do kontrolera
    } catch {
      throw new AppError('validation', 'Invalid access token.');
    }
  }
}
