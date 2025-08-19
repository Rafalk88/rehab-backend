import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppError } from '@common/errors/app.error.js';
import { PermissionsCacheService } from '@common/cache/permissions-cache.service.js';
import { PrismaService } from '@/prisma/prisma.service.js';

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly cache: PermissionsCacheService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.session?.userId;

    if (!userId) {
      throw new AppError('unauthorized', 'Not authenticated');
    }

    const requiredPermission = this.reflector.get<string>('permission', context.getHandler());

    if (!requiredPermission) {
      return true; // no required permission -> we let it through (public access)
    }

    // check cache
    let perms = await this.cache.get(userId);
    let overrides: { permission: string; allowed: boolean }[] = [];
    let orgIdFromDb: string | null = null;

    if (!perms) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          userRoles: {
            include: {
              role: { include: { rolePermissions: true } },
            },
          },
          userPermissions: true,
        },
      });

      if (!user) {
        throw new AppError('unauthorized', 'User not found');
      }

      perms = user.userRoles.flatMap((ur) =>
        (ur.role.rolePermissions ?? []).map((rp) => rp.permission),
      );
      overrides = user.userPermissions ?? [];
      orgIdFromDb = user.organizationalUnitId ?? null;

      await this.cache.set(userId, perms);
    } else {
      overrides = await this.prisma.userPermission.findMany({ where: { userId } });
      const userRow = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { organizationalUnitId: true },
      });
      orgIdFromDb = userRow?.organizationalUnitId ?? null;
    }

    // check overrides
    const override = overrides.find((o) => o.permission === requiredPermission);
    if (override) {
      if (override.allowed) return true;
      throw new AppError('forbidden', 'Access explicitly denied');
    }

    // check roles
    if (perms.includes(requiredPermission)) {
      const targetOrgId = request.params.orgId ?? request.body?.orgId;
      if (targetOrgId && orgIdFromDb && targetOrgId !== orgIdFromDb) {
        throw new AppError('forbidden', 'Insufficient permissions for this organizational unit');
      }
      return true;
    }

    throw new AppError('forbidden', 'Insufficient permissions');
  }
}
