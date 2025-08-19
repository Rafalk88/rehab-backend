import { AppError } from '@common/errors/app.error.js';
import { verifyToken } from '@lib/jwt.util.js';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Guard that authenticates a user based on a JWT token.
 *
 * - Requires the `Authorization: Bearer <token>` header.
 * - Throws an `AppError` with a 401 status code if the token is missing or invalid.
 * - On successful verification, sets `req.session.userId`.
 *
 * @param context The execution context (contains the request/response objects).
 */
@Injectable()
export class AuthenticationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    if (request.method === 'OPTIONS') {
      response.send({ message: 'Preflight check successful.' });
      return false; // stops further guards/controller
    }

    const token = this.extractToken(request.headers.authorization);
    request['session'] = { userId: verifyToken(token) };
    return true; // allow access
  }

  /*
   * Inside this block:
   * - The JWT token has been validated.
   * - `request.session.userId` is set and can be used by subsequent guards or controllers.
   * - If any check fails, an AppError is thrown and further execution is stopped.
   */
  private extractToken(authHeader?: string): string {
    if (!authHeader) throw new AppError('unauthorized', '`Authorization` header is required.');
    if (!authHeader.startsWith('Bearer '))
      throw new AppError('unauthorized', 'Invalid access token.');

    const token = authHeader.split(' ')[1]?.trim();
    if (!token) throw new AppError('unauthorized', 'Invalid access token.');
    return token;
  }
}
