import { PrismaService } from '#prisma/prisma.service.js';
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

export interface LogParams {
  userId: string | null;
  action: string;
  actionDetails: string;
  entityType: string;
  entityId: string;
  oldValues: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  newValues: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  ipAddress?: string;
}

/**
 * DbLoggerService
 *
 * Service responsible for persisting user/system actions
 * into the `operationLog` table.
 */
@Injectable()
export class DbLoggerService {
  private readonly logger = new Logger(DbLoggerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persists a new audit log entry in the database.
   *
   * @param params - Audit metadata including user, action type, and entity details.
   */
  async logAction({
    userId,
    action,
    actionDetails,
    entityType,
    entityId,
    oldValues,
    newValues,
    ipAddress = 'system',
  }: LogParams): Promise<void> {
    try {
      await this.prisma.operationLog.create({
        data: {
          userId,
          action,
          actionDetails,
          entityType,
          entityId,
          oldValues,
          newValues,
          ipAddress,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log action: ${action} on ${entityType}`, error as Error);
    }
  }
}
