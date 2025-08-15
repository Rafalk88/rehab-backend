import { prisma } from './prismaClient.js';

interface LogParams {
  userId: string;
  action: string;
  actionDetails: string;
  entityType: string;
  entityId: string;
  ipAddress?: string;
}

export const logAction = async ({
  userId,
  action,
  actionDetails,
  entityType,
  entityId,
  ipAddress = 'system',
}: LogParams) => {
  try {
    await prisma.operationLog.create({
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
    console.error('Failed to log action:', error);
  }
};
