import { jest } from '@jest/globals';
import { DbLoggerService, LogParams } from './DbLoggerService.js';
import { PrismaService } from '#prisma/prisma.service.js';
import { Prisma } from '@prisma/client';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

describe('DbLoggerService', () => {
  let service: DbLoggerService;
  let prisma: jest.Mocked<PrismaService>;
  let nestLogger: ReturnType<typeof jest.spyOn>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DbLoggerService,
        {
          provide: PrismaService,
          useValue: {
            operationLog: {
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get(DbLoggerService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    nestLogger = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const sampleLog: LogParams = {
    userId: 'user-123',
    action: 'CREATE',
    actionDetails: 'Created new record',
    entityType: 'User',
    entityId: 'user-123',
    ipAddress: '127.0.0.1',
    oldValues: Prisma.JsonNull,
    newValues: Prisma.JsonNull,
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
      oldValues: Prisma.JsonNull,
      newValues: Prisma.JsonNull,
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
