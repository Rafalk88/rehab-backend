import { RequestContextService } from '../../context/request-context.service.js';
import { DbLoggerService } from '#lib/DbLoggerService.js';
import { jest } from '@jest/globals';

await jest.unstable_mockModule('#prisma/prisma.service.js', () => ({
  PrismaService: class {
    $connect = jest.fn();
    $disconnect = jest.fn();
    $use = jest.fn();
    operationLog = {
      create: jest.fn(),
    };
    user = {
      findUnique: jest.fn(),
    };
  },
}));

const { PrismaService } = await import('#prisma/prisma.service.js');
const { AuditMiddleware } = await import('./audit-middleware.js');

describe('AuditMiddleware', () => {
  let middleware: InstanceType<typeof AuditMiddleware>;
  let prisma: jest.Mocked<typeof PrismaService>;
  let dbLogger: jest.Mocked<DbLoggerService>;
  let requestContext: jest.Mocked<RequestContextService>;

  beforeEach(async () => {
    dbLogger = { logAction: jest.fn() } as any;
    requestContext = {
      get: jest.fn().mockReturnValue({ userId: 'user-123', ipAddress: '127.0.0.1' }),
    } as any;

    prisma = new PrismaService() as any;

    middleware = new AuditMiddleware(prisma as any, dbLogger, requestContext);
  });

  afterEach(() => jest.clearAllMocks());

  it('✅ should register Prisma $use middleware on module init', () => {
    middleware.onModuleInit();
    expect((prisma as any).$use).toHaveBeenCalledTimes(1);
    expect(typeof (prisma as any).$use.mock.calls[0][0]).toBe('function');
  });

  it('✅ should call dbLogger.logAction on create mutation', async () => {
    middleware.onModuleInit();

    const prismaMiddleware = (prisma as any).$use.mock.calls[0][0];

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
    const prismaMiddleware = (prisma as any).$use.mock.calls[0][0];

    const params = {
      model: 'OperationLog',
      action: 'create',
      args: { data: {} },
    };

    const next = jest.fn().mockResolvedValue({} as never);
    await prismaMiddleware(params, next);

    expect(next).toHaveBeenCalled();
    expect(dbLogger.logAction).not.toHaveBeenCalled();
  });

  it('✅ should handle missing model safely', async () => {
    middleware.onModuleInit();
    const prismaMiddleware = (prisma as any).$use.mock.calls[0][0];

    const params = {
      model: undefined,
      action: 'create',
      args: { data: {} },
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
    const prismaMiddleware = (prisma as any).$use.mock.calls[0][0];

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
    const prismaMiddleware = (prisma as any).$use.mock.calls[0][0];

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
