import { AuditMiddleware } from './audit-middleware.js';
import { RequestContextService } from '../../context/request-context.service.js';
import { DbLoggerService } from '#lib/DbLoggerService.js';
import { PrismaService } from '#prisma/prisma.service.js';
import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

describe('AuditMiddleware', () => {
  let middleware: AuditMiddleware;
  let prisma: jest.Mocked<PrismaService>;
  let dbLogger: jest.Mocked<DbLoggerService>;
  let requestContext: jest.Mocked<RequestContextService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditMiddleware,
        {
          provide: PrismaService,
          useValue: {
            $use: jest.fn(),
          },
        },
        {
          provide: DbLoggerService,
          useValue: {
            logAction: jest.fn(),
          },
        },
        {
          provide: RequestContextService,
          useValue: {
            get: jest.fn().mockReturnValue({ userId: 'user-123', ipAddress: '127.0.0.1' }),
          },
        },
      ],
    }).compile();

    middleware = module.get(AuditMiddleware);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    dbLogger = module.get(DbLoggerService) as jest.Mocked<DbLoggerService>;
    requestContext = module.get(RequestContextService) as jest.Mocked<RequestContextService>;
  });

  afterEach(() => jest.clearAllMocks());

  it('✅ should register Prisma $use middleware on module init', () => {
    middleware.onModuleInit();
    expect(prisma.$use as unknown as jest.Mock).toHaveBeenCalledTimes(1);
    expect(typeof (prisma.$use.mock.calls[0] as unknown as jest.Mock)[0]).toBe('function');
  });

  it('✅ should call dbLogger.logAction on create mutation', async () => {
    middleware.onModuleInit();

    const prismaMiddleware = (prisma.$use.mock.calls[0] as unknown as jest.Mock)[0];

    const params = {
      model: 'User',
      action: 'create',
      args: { data: { name: 'John' } },
    };

    const next = jest.fn().mockResolvedValue({ id: 'abc-123', name: 'John' } as never);

    await prismaMiddleware(params, next);

    expect(next).toHaveBeenCalledWith(params);
    expect(dbLogger.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'create',
        entityType: 'User',
        entityId: 'abc-123',
        userId: 'user-123',
        ipAddress: '127.0.0.1',
      }),
    );
  });

  it('✅ should skip excluded models', async () => {
    middleware.onModuleInit();
    const prismaMiddleware = (prisma.$use.mock.calls[0] as unknown as jest.Mock)[0];

    const params = {
      model: 'OperationLog',
      action: 'create',
    };

    const next = jest.fn().mockResolvedValue({} as never);
    await prismaMiddleware(params, next);

    expect(next).toHaveBeenCalled();
    expect(dbLogger.logAction).not.toHaveBeenCalled();
  });

  it('✅ should handle missing model safely', async () => {
    middleware.onModuleInit();
    const prismaMiddleware = (prisma.$use.mock.calls[0] as unknown as jest.Mock)[0];

    const params = {
      model: undefined,
      action: 'create',
    };

    const next = jest.fn().mockResolvedValue({} as never);
    await prismaMiddleware(params, next);

    expect(next).toHaveBeenCalled();
    expect(dbLogger.logAction).not.toHaveBeenCalled();
  });

  it('✅ should include old record for update', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 'u1', name: 'Old' } as never);
    (prisma as any).user = { findUnique };

    middleware.onModuleInit();
    const prismaMiddleware = (prisma.$use.mock.calls[0] as unknown as jest.Mock)[0];

    const params = {
      model: 'User',
      action: 'update',
      args: { where: { id: 'u1' }, data: { name: 'New' } },
    };

    const next = jest.fn().mockResolvedValue({ id: 'u1', name: 'New' } as never);

    await prismaMiddleware(params, next);

    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'u1' } });
    expect(dbLogger.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        oldValues: { id: 'u1', name: 'Old' },
        newValues: { id: 'u1', name: 'New' },
      }),
    );
  });

  it('🚨 should swallow findUnique errors gracefully', async () => {
    const findUnique = jest.fn().mockRejectedValue(new Error('DB fail') as never);
    (prisma as any).user = { findUnique };

    middleware.onModuleInit();
    const prismaMiddleware = (prisma.$use.mock.calls[0] as unknown as jest.Mock)[0];

    const params = {
      model: 'User',
      action: 'update',
      args: { where: { id: 'u1' }, data: { name: 'New' } },
    };

    const next = jest.fn().mockResolvedValue({ id: 'u1', name: 'New' } as never);

    await expect(prismaMiddleware(params, next)).resolves.not.toThrow();
    expect(dbLogger.logAction).toHaveBeenCalled();
  });
});
