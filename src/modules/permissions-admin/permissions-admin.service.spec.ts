import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsAdminService } from './permissions-admin.service.js';
import { PrismaService } from '@/prisma/prisma.service.js';
import { DbLoggerService } from '@lib/DbLoggerService.js';
import { AppError } from '@common/errors/app.error.js';

describe('PermissionsAdminService', () => {
  let service: PermissionsAdminService;
  let prisma: jest.Mocked<PrismaService>;
  let dbLogger: jest.Mocked<DbLoggerService>;

  const adminId = 'admin-1';
  const ipAddress = '127.0.0.1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsAdminService,
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: jest.fn() },
            role: { findUnique: jest.fn() },
            userRole: { create: jest.fn() },
            rolePermission: { create: jest.fn() },
            userPermission: { upsert: jest.fn() },
          },
        },
        {
          provide: DbLoggerService,
          useValue: {
            logAction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(PermissionsAdminService);
    prisma = module.get(PrismaService);
    dbLogger = module.get(DbLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('assignRoleToUser', () => {
    it('should assign a role to a user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'user-1',
        email: 'test@a.com',
      } as any);
      (prisma.role.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'role-1',
        name: 'Admin',
      } as any);
      (prisma.userRole.create as jest.Mock).mockResolvedValueOnce({ id: 'userRole-1' } as any);

      const result = await service.assignRoleToUser('user-1', 'role-1', adminId, ipAddress);

      expect(result).toEqual({ id: 'userRole-1' });
      expect(prisma.userRole.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', roleId: 'role-1', assignedById: adminId },
      });
      expect(dbLogger.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'assign_role' }),
      );
    });

    it('should throw if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
      (prisma.role.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'role-1' } as any);

      await expect(
        service.assignRoleToUser('user-1', 'role-1', adminId, ipAddress),
      ).rejects.toThrow(AppError);
    });

    it('should throw if role not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'user-1' } as any);
      (prisma.role.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        service.assignRoleToUser('user-1', 'role-1', adminId, ipAddress),
      ).rejects.toThrow(AppError);
    });
  });

  describe('assignPermissionToRole', () => {
    it('should assign a permission to a role', async () => {
      (prisma.role.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'role-1',
        name: 'Admin',
      } as any);
      (prisma.rolePermission.create as jest.Mock).mockResolvedValueOnce({ id: 'perm-1' } as any);

      const result = await service.assignPermissionToRole(
        'role-1',
        { permission: 'user.read' },
        adminId,
        ipAddress,
      );

      expect(result).toEqual({ id: 'perm-1' });
      expect(prisma.rolePermission.create).toHaveBeenCalledWith({
        data: { roleId: 'role-1', permission: 'user.read' },
      });
      expect(dbLogger.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'assign_permission' }),
      );
    });

    it('should throw if role not found', async () => {
      (prisma.role.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        service.assignPermissionToRole('role-1', { permission: 'user.read' }, adminId, ipAddress),
      ).rejects.toThrow(AppError);
    });
  });

  describe('overridePermissionForUser', () => {
    it('should override a permission for a user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'user-1',
        email: 'test@a.com',
      } as any);
      (prisma.userPermission.upsert as jest.Mock).mockResolvedValueOnce({
        id: 'override-1',
      } as any);

      const result = await service.overridePermissionForUser(
        'user-1',
        { permission: 'user.read', allowed: true },
        adminId,
        ipAddress,
      );

      expect(result).toEqual({ id: 'override-1' });
      expect(prisma.userPermission.upsert).toHaveBeenCalledWith({
        where: { userId_permission: { userId: 'user-1', permission: 'user.read' } },
        update: { allowed: true },
        create: { userId: 'user-1', permission: 'user.read', allowed: true },
      });
      expect(dbLogger.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'override_permission' }),
      );
    });

    it('should throw if user not found', async () => {
      (prisma.role.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        service.overridePermissionForUser(
          'user-1',
          { permission: 'user.read', allowed: true },
          adminId,
          ipAddress,
        ),
      ).rejects.toThrow(AppError);
    });
  });
});
