import { RequestContextService } from '#context/request-context.service.js';
import { Request, Response, NextFunction } from 'express';
import { Injectable, NestMiddleware } from '@nestjs/common';

/**
 * PrismaSessionMiddleware
 *
 * Captures per-request user and IP information and stores it
 * in AsyncLocalStorage for use inside Prisma middleware and
 * other services.
 */
@Injectable()
export class PrismaSessionMiddleware implements NestMiddleware {
  constructor(private readonly requestContext: RequestContextService) {}

  use(req: Request, _: Response, next: NextFunction) {
    const userId = (req as any).user?.id ?? null;

    const ipAddress =
      req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ??
      req.socket.remoteAddress ??
      'unknown';

    this.requestContext.run({ userId, ipAddress }, () => {
      next();
    });
  }
}
