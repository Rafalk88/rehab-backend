import { RequestContextService } from '../../context/request-context.service.js';
import { DbLoggerService } from '#lib/DbLoggerService.js';
import { PrismaService } from '#prisma/prisma.service.js';
import { Prisma } from '#/generated/prisma/client.js';
import { Injectable, OnModuleInit } from '@nestjs/common';

/**
 * AuditMiddleware
 *
 * Automatically captures database mutation operations (create, update, delete, upsert)
 * and logs them to the OperationLog table for auditing and compliance.
 *
 * - Uses context (userId, ipAddress) injected per request by PrismaSessionMiddleware.
 * - Runs transparently for all Prisma mutations.
 * - Excludes system tables (OperationLog, RefreshToken, etc.) to prevent recursion.
 * - Retains logs for 5 years.
 */
@Injectable()
export class AuditMiddleware implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbLogger: DbLoggerService,
    private readonly requestContext: RequestContextService,
  ) {}

  onModuleInit() {
    this.prisma.$use(async (params, next) => {
      const mutationTypes = ['create', 'update', 'delete', 'upsert'];
      const excludedModels = ['OperationLog', 'BlacklistedToken', 'RefreshToken'];

      if (!mutationTypes.includes(params.action) || excludedModels.includes(params.model!)) {
        return next(params);
      }

      if (!params.model) {
        return next(params);
      }

      const context = this.requestContext.get();
      const userId = context?.userId ?? null;
      const actionDetails =
        context?.auditMeta?.actionDetails ?? `Automatic audit for ${params.model}.${params.action}`;
      const ipAddress = context?.ipAddress ?? 'system';

      const oldRecord = context?.auditMeta?.oldValues;

      const result = await next(params);

      const entityId =
        (params.args as any)?.where?.id ??
        (typeof result === 'object' && result && 'id' in result ? (result as any).id : null);

      const newRecord =
        params.action === 'delete'
          ? null
          : ['create', 'update', 'upsert'].includes(params.action)
            ? (context?.auditMeta?.newValues ?? result)
            : null;

      const retentionUntil = new Date();
      retentionUntil.setFullYear(retentionUntil.getFullYear() + 5);

      try {
        await this.dbLogger.logAction({
          userId,
          action: params.action,
          actionDetails: actionDetails,
          entityType: params.model!,
          entityId,
          oldValues: oldRecord ?? Prisma.DbNull,
          newValues: newRecord ?? Prisma.DbNull,
          retentionUntil,
          ipAddress,
        });
      } catch (err) {}

      return result;
    });
  }
}
