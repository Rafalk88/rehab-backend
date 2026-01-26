import { RequestContextService } from '../../context/request-context.service.js';
import { Request, Response, NextFunction } from 'express';
import { Injectable, NestMiddleware } from '@nestjs/common';

/**
 * PrismaSessionMiddleware
 *
 * Ensure request context store is created for every request and contains
 * userId, ipAddress and an initial auditMeta object.
 */
@Injectable()
export class PrismaSessionMiddleware implements NestMiddleware {
  constructor(private readonly requestContext: RequestContextService) {}

  use(req: Request, _: Response, next: NextFunction) {
    const userId = (req as any).user?.id ?? (req as any).session?.userId ?? null;

    const ipAddress =
      req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ??
      req.socket.remoteAddress ??
      'unknown';

    this.requestContext.run(
      {
        userId,
        ipAddress,
        auditMeta: {},
      },
      () => {
        next();
      },
    );
  }
}
