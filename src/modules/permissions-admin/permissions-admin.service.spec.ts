import { jest } from '@jest/globals';
import { PrismaService } from '#prisma/prisma.service.js';
import { PermissionsAdminService } from './permissions-admin.service.js';
import { AppError } from '#common/errors/app.error.js';
import { RequestContextService } from '#context/request-context.service.js';
import { Test, TestingModule } from '@nestjs/testing';

describe('PermissionsAdminService', () => {
  let service: PermissionsAdminService;
  let prisma: jest.Mocked<PrismaService>;
  let requestContext: jest.Mocked<RequestContextService>;

  const adminId = 'admin-1';

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
            userPermission: { upsert: jest.fn(), findUnique: jest.fn() },
          },
        },
        {
          provide: RequestContextService,
          useValue: {
            withAudit: jest.fn().mockImplementation((_meta, cb) => (cb as any)()),
          },
        },
      ],
    }).compile();

    service = module.get(PermissionsAdminService);
    prisma = module.get(PrismaService);
    requestContext = module.get(RequestContextService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('assignRoleToUser', () => {
    it('should assign a role to a user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'user-1',
        loginMasked: 'u****1',
      } as never);
      (prisma.role.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'role-1',
        name: 'Admin',
      } as never);
      (prisma.userRole.create as jest.Mock).mockResolvedValueOnce({ id: 'userRole-1' } as never);

      const result = await service.assignRoleToUser('user-1', 'role-1', adminId);

      expect(result).toEqual({ id: 'userRole-1' });
      expect(prisma.userRole.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', roleId: 'role-1', assignedById: adminId },
      });
      expect(requestContext.withAudit).toHaveBeenCalledTimes(1);
      expect(requestContext.withAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          actionDetails: expect.stringContaining('Assigned role "Admin" to user "u****1"'),
          newValues: { userId: 'user-1', roleId: 'role-1', assignedById: adminId },
        }),
        expect.any(Function),
      );
    });

    it('should throw if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null as never);
      (prisma.role.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'role-1' } as never);

      await expect(service.assignRoleToUser('user-1', 'role-1', adminId)).rejects.toThrow(AppError);
    });

    it('should throw if role not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'user-1',
        loginMasked: 'u****1',
      } as never);
      (prisma.role.findUnique as jest.Mock).mockResolvedValueOnce(null as never);

      await expect(service.assignRoleToUser('user-1', 'role-1', adminId)).rejects.toThrow(AppError);
    });
  });

  describe('assignPermissionToRole', () => {
    it('should assign a permission to a role', async () => {
      (prisma.role.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'role-1',
        name: 'Admin',
      } as never);
      (prisma.rolePermission.create as jest.Mock).mockResolvedValueOnce({ id: 'perm-1' } as never);

      const result = await service.assignPermissionToRole('role-1', { permission: 'user.read' });

      expect(result).toEqual({ id: 'perm-1' });
      expect(prisma.rolePermission.create).toHaveBeenCalledWith({
        data: { roleId: 'role-1', permission: 'user.read' },
      });
      expect(requestContext.withAudit).toHaveBeenCalledTimes(1);
      expect(requestContext.withAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          actionDetails: expect.stringContaining('Assigned permission "user.read" to role "Admin"'),
          newValues: { roleId: 'role-1', permission: 'user.read' },
        }),
        expect.any(Function),
      );
    });

    it('should throw if role not found', async () => {
      (prisma.role.findUnique as jest.Mock).mockResolvedValueOnce(null as never);

      await expect(
        service.assignPermissionToRole('role-1', { permission: 'user.read' }),
      ).rejects.toThrow(AppError);
    });
  });

  describe('overridePermissionForUser', () => {
    it('should override a permission for a user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'user-1',
        loginMasked: 'u****1',
      } as never);

      (prisma.userPermission.findUnique as jest.Mock).mockResolvedValueOnce(null as never);

      (prisma.userPermission.upsert as jest.Mock).mockResolvedValueOnce({
        id: 'override-1',
      } as never);

      const result = await service.overridePermissionForUser('user-1', {
        permission: 'user.read',
        allowed: true,
      });

      expect(result).toEqual({ id: 'override-1' });
      expect(prisma.userPermission.upsert).toHaveBeenCalledWith({
        where: { userId_permission: { userId: 'user-1', permission: 'user.read' } },
        update: { allowed: true },
        create: { userId: 'user-1', permission: 'user.read', allowed: true },
      });
      expect(requestContext.withAudit).toHaveBeenCalledTimes(1);
      expect(requestContext.withAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          actionDetails: 'Permission "user.read" granted for user "u****1"',
          oldValues: {},
          newValues: { userId: 'user-1', permission: 'user.read', allowed: true },
        }),
        expect.any(Function),
      );
    });

    it('should throw if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null as never);

      await expect(
        service.overridePermissionForUser('user-1', { permission: 'user.read', allowed: true }),
      ).rejects.toThrow(AppError);
    });
  });
});
