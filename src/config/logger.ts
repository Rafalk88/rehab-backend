import { prisma } from '@prisma/client';

interface LogParams {
  user_id: string;
  action: string;
  action_details: string;
  entity_type: string;
  entity_id: string;
  ip_address?: string;
}

export const logAction = async ({
  user_id,
  action,
  action_details,
  entity_type,
  entity_id,
  ip_address = 'system',
}: LogParams) => {
  try {
    await prisma.operationLog.create({
      data: {
        user_id,
        action,
        action_details,
        entity_type,
        entity_id,
        ip_address,
      },
    });
  } catch (error) {
    console.error('Failed to log action:', error);
  }
};
