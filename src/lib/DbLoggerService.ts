import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service.js';

export interface LogParams {
  userId: string;
  action: string;
  actionDetails: string;
  entityType: string;
  entityId: string;
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
   * Saves a log entry in the database.
   *
   * @param params - Information about the performed action.
   */
  async logAction({
    userId,
    action,
    actionDetails,
    entityType,
    entityId,
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
          ipAddress,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log action for user ${userId}`, error as any);
    }
  }
}
