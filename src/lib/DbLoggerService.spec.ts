import { jest } from '@jest/globals';

await jest.unstable_mockModule('#prisma/prisma.service.js', () => ({
  PrismaService: class {
    operationLog = { create: jest.fn() };
  },
}));

const { PrismaService } = await import('#prisma/prisma.service.js');
const { DbLoggerService } = await import('./DbLoggerService.js');
const { Logger } = await import('@nestjs/common');

describe('DbLoggerService', () => {
  let service: InstanceType<typeof DbLoggerService>;
  let prisma: jest.Mocked<InstanceType<typeof PrismaService>>;
  let nestLogger: ReturnType<typeof jest.spyOn>;

  beforeEach(async () => {
    service = new DbLoggerService(new PrismaService());
    prisma = service['prisma'] as jest.Mocked<InstanceType<typeof PrismaService>>;
    nestLogger = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const sampleLog = {
    userId: 'user-123',
    action: 'CREATE',
    actionDetails: 'Created new record',
    entityType: 'User',
    entityId: 'user-123',
    ipAddress: '127.0.0.1',
    retentionUntil: new Date(),
    oldValues: {},
    newValues: {},
  };

  it('✅ should call prisma.operationLog.create with correct params', async () => {
    await service.logAction(sampleLog);

    expect(prisma.operationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-123',
        action: 'CREATE',
        actionDetails: 'Created new record',
        entityType: 'User',
        entityId: 'user-123',
        ipAddress: '127.0.0.1',
      }),
    });
  });

  it('✅ should fallback ipAddress to "system" if not provided', async () => {
    await service.logAction({
      userId: 'user-1',
      action: 'UPDATE',
      actionDetails: 'Changed password',
      entityType: 'User',
      entityId: 'user-1',
      retentionUntil: new Date(),
      oldValues: {},
      newValues: {},
    });

    expect(prisma.operationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ipAddress: 'system',
      }),
    });
  });

  it('🚨 should log error if prisma call fails', async () => {
    (prisma.operationLog.create as jest.Mock).mockRejectedValueOnce(new Error('DB error') as never);

    await service.logAction(sampleLog);

    expect(nestLogger).toHaveBeenCalledWith(
      expect.stringContaining('Failed to log action'),
      expect.any(Error),
    );
  });
});
