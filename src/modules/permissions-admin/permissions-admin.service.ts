import type {
  AssignPermissionSchema,
  OverridePermissionSchema,
} from './permissions-admin.schemas.js';
import { AppError } from '#common/errors/app.error.js';
import { RequestContextService } from '#/context/request-context.service.js';
import { PrismaService } from '#prisma/prisma.service.js';
import { Injectable } from '@nestjs/common';
import { Prisma } from '#/generated/prisma/client.js';

@Injectable()
export class PermissionsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {}

  /**
   * Assigns a role to a user.
   */
  async assignRoleToUser(userId: string, roleId: string, adminId: string) {
    const [user, role] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.role.findUnique({ where: { id: roleId } }),
    ]);

    if (!user) throw new AppError('not_found', 'User not found');
    if (!role) throw new AppError('not_found', 'Role not found');

    const newValues = {
      userId: user.id,
      roleId: role.id,
      assignedById: adminId,
    };

    const userRole = await this.requestContext.withAudit(
      {
        actionDetails: `Assigned role "${role.name}" to user "${user.loginMasked}"`,
        newValues,
      },
      () =>
        this.prisma.userRole.create({
          data: newValues,
        }),
    );

    return userRole;
  }

  /**
   * Assigns a permission to a role.
   */
  async assignPermissionToRole(roleId: string, data: AssignPermissionSchema) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new AppError('not_found', 'Role not found');

    const newValues = {
      roleId: role.id,
      permission: data.permission,
    };

    const rolePermission = await this.requestContext.withAudit(
      {
        actionDetails: `Assigned permission "${data.permission}" to role "${role.name}"`,
        newValues,
      },
      () =>
        this.prisma.rolePermission.create({
          data: newValues,
        }),
    );

    return rolePermission;
  }

  /**
   * Overrides a permission for a specific user.
   */
  async overridePermissionForUser(userId: string, data: OverridePermissionSchema) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('not_found', 'User not found');

    const existing = await this.prisma.userPermission.findUnique({
      where: { userId_permission: { userId: user.id, permission: data.permission } },
    });

    const newValues = { userId: user.id, permission: data.permission, allowed: data.allowed };

    const override = await this.requestContext.withAudit(
      {
        actionDetails: `Permission "${data.permission}" ${data.allowed ? 'granted' : 'revoked'} for user "${user.loginMasked}"`,
        oldValues: existing ?? Prisma.DbNull,
        newValues,
      },
      () =>
        this.prisma.userPermission.upsert({
          where: { userId_permission: { userId: user.id, permission: data.permission } },
          update: { allowed: data.allowed },
          create: newValues,
        }),
    );

    return override;
  }
}
