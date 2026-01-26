import { createAuditExtension } from './extensions/audit.extension.js';
import { RequestContextService } from '#context/request-context.service.js';
import { Prisma, PrismaClient } from '#/generated/prisma/client.js';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

export type AuditHandler = (params: {
  model: string;
  action: string;
  entityId: any;
  oldValues: any;
  newValues: any;
  ctx: { userId: string | null; ipAddress: string };
}) => Promise<void>;

/**
 * PrismaService
 *
 * - Extends generated PrismaClient.
 * - Registers Prisma middleware produced by AuditMiddleware during onModuleInit()
 *   (registration in onModuleInit avoids ESM/DI cyclic initialization issues).
 * - Manages connect/disconnect lifecycle.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly auditHandler: AuditHandler,
  ) {
    //! super always must be on top!
    super();

    const auditExtension = createAuditExtension(
      async ({ model, action, entityId, oldValues, newValues }) => {
        const ctx = this.requestContext.get() ?? {};

        await this.auditHandler({
          model,
          action,
          entityId: entityId ?? Prisma.DbNull,
          oldValues: oldValues ?? Prisma.DbNull,
          newValues: newValues ?? Prisma.DbNull,
          ctx: {
            userId: ctx.userId ?? null,
            ipAddress: ctx.ipAddress ?? 'system',
          },
        });
      },
    );

    Object.assign(this, this.$extends(auditExtension));
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
