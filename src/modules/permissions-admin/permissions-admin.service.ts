import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service.js';
import { DbLoggerService } from '@lib/DbLoggerService.js';
import { AppError } from '@/common/errors/app.error.js';

import type {
  AssignPermissionSchema,
  OverridePermissionSchema,
} from './permissions-admin.schemas.js';

@Injectable()
export class PermissionsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbLogger: DbLoggerService,
  ) {}

  /**
   * Assigns a role to a user.
   */
  async assignRoleToUser(userId: string, roleId: string, adminId: string, ipAddress: string) {
    const [user, role] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.role.findUnique({ where: { id: roleId } }),
    ]);

    if (!user) throw new AppError('not_found', 'User not found');
    if (!role) throw new AppError('not_found', 'Role not found');

    const userRole = await this.prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id,
        assignedById: adminId,
      },
    });

    await this.dbLogger.logAction({
      userId: adminId,
      action: 'assign_role',
      actionDetails: `Assigned role "${role.name}" to user "${user.email}"`,
      entityType: 'UserRole',
      entityId: userRole.id,
      oldValues: {},
      newValues: userRole,
      ipAddress,
    });

    return userRole;
  }

  /**
   * Assigns a permission to a role.
   */
  async assignPermissionToRole(
    roleId: string,
    data: AssignPermissionSchema,
    adminId: string,
    ipAddress: string,
  ) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new AppError('not_found', 'Role not found');

    const rolePermission = await this.prisma.rolePermission.create({
      data: {
        roleId: role.id,
        permission: data.permission,
      },
    });

    await this.dbLogger.logAction({
      userId: adminId,
      action: 'assign_permission',
      actionDetails: `Assigned permission "${data.permission}" to role "${role.name}"`,
      entityType: 'RolePermission',
      entityId: rolePermission.id,
      oldValues: {},
      newValues: rolePermission,
      ipAddress,
    });

    return rolePermission;
  }

  /**
   * Overrides a permission for a specific user.
   */
  async overridePermissionForUser(
    userId: string,
    data: OverridePermissionSchema,
    adminId: string,
    ipAddress: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('not_found', 'User not found');

    const override = await this.prisma.userPermission.upsert({
      where: { userId_permission: { userId: user.id, permission: data.permission } },
      update: { allowed: data.allowed },
      create: { userId: user.id, permission: data.permission, allowed: data.allowed },
    });

    await this.dbLogger.logAction({
      userId: adminId,
      action: 'override_permission',
      actionDetails: `Override ${data.allowed ? 'granted' : 'revoked'} for permission "${
        data.permission
      }" on user ${user.email}`,
      entityType: 'UserPermission',
      entityId: override.id,
      oldValues: {},
      newValues: override,
      ipAddress,
    });

    return override;
  }
}
