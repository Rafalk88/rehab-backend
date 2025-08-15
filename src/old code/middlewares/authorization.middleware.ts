import type { NextFunction, Request, Response } from 'express';
import type { PrismaClient } from '@prisma/client';
import prisma from '@config/prismaClient';
import { AppError } from '@errors/app.error';
import { cacheGet, cacheSet } from './permissions.cache.js';

/* Ładuje z bazy uprawnienia przypisane do ról i nadpisane indywidualnie */
async function loadPermissionsFromDb(userId: string, prismaInstance: PrismaClient = prisma) {
  const user = await prismaInstance.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: {
          role: {
            include: { rolePermissions: true },
          },
        },
      },
      userPermissions: true,
    },
  });

  if (!user) return null;

  const rolePerms = user.userRoles.flatMap((ur) =>
    (ur.role.rolePermissions ?? []).map((rp) => rp.permission),
  );

  const overrides = user.userPermissions ?? [];

  return { rolePerms, overrides, orgId: user.organizationalUnitId ?? null };
}

/**
 * Middleware autoryzujący dostęp do zasobów.
 *
 * - Sprawdza, czy użytkownik posiada wymagane uprawnienia.
 * - Uwzględnia uprawnienia z ról oraz indywidualne nadpisania (`overrides`).
 * - Obsługuje opcjonalne dopasowanie jednostki organizacyjnej.
 *
 * @param requiredPermission Wymagane uprawnienie (string).
 * @param options Opcje dodatkowe:
 *  - `matchOrgUnitParam`: nazwa parametru w URL lub body, którego zgodność z orgId użytkownika ma być wymagana.
 * @param prismaInstance (opcjonalnie) instancja PrismaClient.
 */
export const authorization =
  (
    requiredPermission: string,
    options?: { matchOrgUnitParam?: string },
    prismaInstance: PrismaClient = prisma,
  ) =>
  async (req: Request, _: Response, _next: NextFunction) => {
    const userId = req.session?.userId;
    if (!userId) return _next(new AppError('unauthorized', 'Not authenticated'));

    const targetOrgId = options?.matchOrgUnitParam
      ? (req.params[options.matchOrgUnitParam] ?? (req.body as any)[options.matchOrgUnitParam])
      : undefined;

    let perms = cacheGet(userId);
    let overrides: { permission: string; allowed: boolean }[] = [];
    let orgIdFromDb: string | null = null;

    if (!perms) {
      const loaded = await loadPermissionsFromDb(userId, prismaInstance);
      if (!loaded) return _next(new AppError('unauthorized', 'User not found'));
      perms = Array.from(new Set(loaded.rolePerms));
      overrides = loaded.overrides;
      orgIdFromDb = loaded.orgId;
      cacheSet(userId, perms);
    } else {
      const userOverrides = await prismaInstance.userPermission.findMany({ where: { userId } });
      overrides = userOverrides;
      const userRow = await prismaInstance.user.findUnique({ where: { id: userId } });
      orgIdFromDb = userRow?.organizationalUnitId ?? null;
    }

    const override = overrides.find((o) => o.permission === requiredPermission);
    if (override) {
      if (override.allowed) return _next();
      return _next(new AppError('forbidden', 'Access explicitly denied'));
    }

    if (perms.includes(requiredPermission)) {
      if (targetOrgId && orgIdFromDb && targetOrgId !== orgIdFromDb) {
        return _next(
          new AppError('forbidden', 'Insufficient permissions for this organizational unit'),
        );
      }
      return _next();
    }

    return _next(new AppError('forbidden', 'Insufficient permissions'));
  };
