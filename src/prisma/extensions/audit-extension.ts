import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

type AuditSession = {
  userId?: string;
  ipAddress?: string;
  oldRecord?: Record<string, unknown> | null;
  newRecord?: Record<string, unknown> | null;
};

type AuditParams<TArgs = unknown, TResult = unknown> = {
  model: Prisma.ModelName;
  operation: 'create' | 'update' | 'delete' | 'upsert';
  args: TArgs;
  query: (args: TArgs) => Promise<TResult>;
  session: AuditSession;
};

type MutatingArgs = { data?: Record<string, unknown> };

type AuditManualParams = {
  userId?: string | null;
  ipAddress?: string;
  action: string;
  entityType: string;
  actionDetails: string;
  entityId?: string | null;
  oldRecord?: Record<string, unknown> | null;
  newRecord?: Record<string, unknown> | null;
};

const FIVE_YEARS = 5 * 365;

export function createAuditExtension(dbLogger: any, excludedModels: Prisma.ModelName[]) {
  async function handleAudit<TArgs extends MutatingArgs = MutatingArgs, TResult = unknown>(
    this: PrismaClient,
    params: AuditParams<TArgs, TResult>,
  ): Promise<TResult> {
    const { model, operation, args, query, session } = params;

    const isExcludedModel = !model || excludedModels.includes(model);
    const isAuditableOperation = ['create', 'update', 'delete', 'upsert'].includes(operation);

    if (isExcludedModel || !isAuditableOperation) return query(args);

    const userId: string | null =
      typeof session?.userId === 'string' && session.userId.length > 0 ? session.userId : null;

    let oldRecord: any = session?.oldRecord ?? null;

    if (operation === 'create' && userId && args.data && 'createdBy' in args.data) {
      args.data.createdBy = userId;
    }

    if (operation === 'update' && userId && args.data && 'updatedBy' in args.data) {
      args.data.updatedBy = userId;
    }

    const result = await query(args);

    const newRecord: any =
      session?.newRecord ?? (['create', 'update', 'upsert'].includes(operation) ? result : null);

    const entityId =
      (args as any)?.where?.id ??
      (typeof result === 'object' && result !== null && 'id' in result ? (result as any).id : null);

    const retentionUntil = new Date();
    retentionUntil.setDate(retentionUntil.getDate() + FIVE_YEARS);

    await dbLogger.logAction({
      userId,
      action: operation,
      actionDetails: `Automatic audit for ${model}.${operation}`,
      entityType: model,
      entityId,
      oldValues: oldRecord ?? Prisma.JsonNull,
      newValues: newRecord ?? Prisma.JsonNull,
      ipAddress: session?.ipAddress ?? 'system',
      retentionUntil,
    });

    return result;
  }

  async function triggerAudit(
    dbLogger: { logAction: (params: any) => Promise<void> },
    params: AuditManualParams,
  ) {
    const {
      userId = null,
      ipAddress = 'system',
      action,
      entityType,
      actionDetails = `Manual audit for ${entityType}.${action}`,
      entityId = null,
      oldRecord = null,
      newRecord = null,
    } = params;

    const retentionUntil = new Date();
    retentionUntil.setDate(retentionUntil.getDate() + FIVE_YEARS);

    await dbLogger.logAction({
      userId,
      action,
      actionDetails,
      entityType,
      entityId,
      oldValues: oldRecord ?? Prisma.JsonNull,
      newValues: newRecord ?? Prisma.JsonNull,
      ipAddress,
      retentionUntil,
    });
  }

  return Prisma.defineExtension({
    name: 'audit-extension',
    query: {
      $allModels: {
        async create(params) {
          return handleAudit.call(this as unknown as PrismaClient, {
            ...params,
            session: (this as any)._sessionContext ?? {},
          });
        },
        async update(params) {
          return handleAudit.call(this as unknown as PrismaClient, {
            ...params,
            session: (this as any)._sessionContext ?? {},
          });
        },
        async delete(params) {
          return handleAudit.call(this as unknown as PrismaClient, {
            ...params,
            session: (this as any)._sessionContext ?? {},
          });
        },
        async upsert(params) {
          return handleAudit.call(this as unknown as PrismaClient, {
            ...params,
            session: (this as any)._sessionContext ?? {},
          });
        },
      },
    },
    client: {
      triggerAudit,
    },
  });
}
