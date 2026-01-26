import { PrismaSessionMiddleware } from './middleware/prisma-session.js';
import { PrismaService } from './prisma.service.js';
import { RequestContextModule } from '../context/request-context.module.js';
import { DbLoggerService } from '#lib/DbLoggerService.js';
import { Global, Module } from '@nestjs/common';

export type AuditHandler = (params: {
  model: string;
  action: string;
  entityId: any;
  oldValues: any;
  newValues: any;
  ctx: { userId: string | null; ipAddress: string };
}) => Promise<void>;

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
  providers: [
    DbLoggerService,
    {
      provide: 'AUDIT_HANDLER',
      useFactory: (dbLogger: DbLoggerService) => {
        return async ({ model, action, entityId, oldValues, newValues, ctx }) => {
          await dbLogger.logAction({
            userId: ctx.userId,
            action,
            actionDetails: `Automatic audit for ${model}.${action}`,
            entityType: model,
            entityId,
            oldValues,
            newValues,
            retentionUntil: new Date(Date.now() + 5 * 365 * 24 * 3600 * 1000),
            ipAddress: ctx.ipAddress,
          });
        };
      },
      inject: [DbLoggerService],
    },
    {
      provide: PrismaService,
      useFactory: (requestContext, auditHandler: AuditHandler) => {
        return new PrismaService(requestContext, auditHandler);
      },
      inject: ['RequestContextService', 'AUDIT_HANDLER'],
    },
    PrismaSessionMiddleware,
  ],
  exports: [PrismaService, DbLoggerService],
})
export class PrismaModule {}
