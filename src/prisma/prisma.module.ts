import { AuditMiddleware } from './middleware/audit-middleware.js';
import { PrismaSessionMiddleware } from './middleware/prisma-session.js';
import { PrismaService } from './prisma.service.js';
import { RequestContextModule } from '../context/request-context.module.js';
import { DbLoggerService } from '#lib/DbLoggerService.js';
import { Global, Module } from '@nestjs/common';

/**
 * PrismaModule
 *
 * A global module that provides database access and auditing functionality.
 * - Exposes a single PrismaService instance (singleton).
 * - Integrates the DbLoggerService used for audit logging.
 * - Can be injected anywhere in the app without re-importing (due to @Global()).
 */
@Global()
@Module({
  imports: [RequestContextModule],
  providers: [PrismaService, DbLoggerService, PrismaSessionMiddleware, AuditMiddleware],
  exports: [PrismaService, DbLoggerService],
})
export class PrismaModule {}
