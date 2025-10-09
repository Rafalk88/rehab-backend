import { PermissionsCache } from './permissions.cache.js';
import { PrismaService } from '#prisma/prisma.service.js';
import { Injectable } from '@nestjs/common';

/**
 * PermissionsService
 *
 * Handles fetching and validating user permissions from DB and cache.
 */
@Injectable()
export class PermissionsService {
  constructor(
    private readonly prismaInstance: PrismaService,
    private readonly cache: PermissionsCache,
  ) {}

  /**
   * Loads permissions from DB (roles + overrides).
   * @param userId - User ID.
   */
  private async loadFromDb(userId: string) {
    const user = await this.prismaInstance.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: { role: { include: { rolePermissions: true } } },
        },
        userPermissions: true,
      },
    });

    if (!user) return null;

    const rolePerms = user.userRoles.flatMap((ur) =>
      (ur.role.rolePermissions ?? []).map((rp) => rp.permission),
    );

    return {
      rolePerms,
      overrides: user.userPermissions ?? [],
      orgId: user.organizationalUnitId ?? null,
    };
  }

  /**
   * Resolves permissions for a given user, with cache support.
   * @param userId - User ID.
   */
  async getPermissions(userId: string) {
    let perms = this.cache.get(userId);
    let overrides: { permission: string; allowed: boolean }[] = [];
    let orgId: string | null = null;

    if (!perms) {
      const loaded = await this.loadFromDb(userId);
      if (!loaded) return null;
      perms = Array.from(new Set(loaded.rolePerms));
      overrides = loaded.overrides;
      orgId = loaded.orgId;
      this.cache.set(userId, perms);
    } else {
      const userOverrides = await this.prismaInstance.userPermission.findMany({
        where: { userId },
      });
      overrides = userOverrides;
      const userRow = await this.prismaInstance.user.findUnique({
        where: { id: userId },
      });
      orgId = userRow?.organizationalUnitId ?? null;
    }

    return { perms, overrides, orgId };
  }

  /**
   * Checks if the user has access to a given permission and optional orgUnit.
   */
  async canAccess(
    userId: string,
    requiredPermission: string,
    targetOrgId?: string,
  ): Promise<boolean> {
    const data = await this.getPermissions(userId);
    if (!data) return false;

    const { perms, overrides, orgId } = data;

    const override = overrides.find((o) => o.permission === requiredPermission);
    if (override) return override.allowed;

    if (perms.includes(requiredPermission)) {
      if (targetOrgId && orgId && targetOrgId !== orgId) return false;
      return true;
    }

    return false;
  }
}
