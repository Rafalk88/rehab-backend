import { PrismaService } from './prisma.service.js';
import { DbLoggerService } from '#lib/DbLoggerService.js';
import { Global, Module, forwardRef } from '@nestjs/common';

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
  providers: [PrismaService, DbLoggerService],
  exports: [PrismaService, DbLoggerService],
})
export class PrismaModule {}
