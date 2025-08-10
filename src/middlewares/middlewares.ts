import prisma from '@config/prismaClient';
import type { PrismaClient } from '@prisma/client';
import { verifyToken } from '@utils/jwt';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '@utils/utilityClasses';
import type { ZodObject } from 'zod';
import { ZodError } from 'zod';

export const permCache = new Map<string, { perms: string[]; expiresAt: number }>();
const TTL_MS = 60_000;

async function loadPermissionsFromDb(
  userId: string,
  prismaInstance: PrismaClient = prisma
) {
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

  const rolePerms = user.userRoles.flatMap(ur =>
    (ur.role.rolePermissions ?? []).map(rp => rp.permission)
  );

  const overrides = user.userPermissions ?? [];

  return { rolePerms, overrides, orgId: user.organizationalUnitId ?? null };
}

function cacheGet(userId: string) {
  const entry = permCache.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    permCache.delete(userId);
    return null;
  }
  return entry.perms;
}

function cacheSet(userId: string, perms: string[]) {
  permCache.set(userId, { perms, expiresAt: Date.now() + TTL_MS });
}

export const authentication = (
  request: Request<unknown>,
  response: Response,
  _next: NextFunction
) => {
  if (request.method === 'OPTIONS')
    return response.send({ message: 'Preflight check successful.' });

  const authHeader = request.headers.authorization;
  if (!authHeader) {
    return _next(new AppError('unauthorized', '`Authorization` header is required.'));
  }

  if (!authHeader.startsWith('Bearer ')) {
    return _next(new AppError('unauthorized', 'Invalid access token.'));
  }

  //? wcześniej w if-ie usuwamy undefined
  // @ts-expect-error
  const token = authHeader.split(' ')[1].trim();

  if (!token) {
    return _next(new AppError('unauthorized', 'Invalid access token.'));
  }

  try {
    request['session'] = { userId: verifyToken(token) };
    _next();
  } catch (e) {
    return _next(new AppError('validation', 'Invalid access token.'));
  }
};

export const authorization =
  (
    requiredPermission: string,
    options?: { matchOrgUnitParam?: string },
    prismaInstance: PrismaClient = prisma
  ) =>
  async (req: Request, _: Response, _next: NextFunction) => {
    const userId = req.session?.userId;
    if (!userId) return _next(new AppError('unauthorized', 'Not authenticated'));

    // (opcjonalnie) sprawdź orgUnit context
    const targetOrgId = options?.matchOrgUnitParam
      ? req.params[options.matchOrgUnitParam] ??
        (req.body as any)[options.matchOrgUnitParam]
      : undefined;

    // pobieraj perms z cache albo z DB
    let perms = cacheGet(userId);
    let overrides: { permission: string; allowed: boolean }[] = [];
    let orgIdFromDb: string | null = null;

    if (!perms) {
      const loaded = await loadPermissionsFromDb(userId, prismaInstance);
      if (!loaded) return _next(new AppError('unauthorized', 'User not found'));
      perms = Array.from(new Set(loaded.rolePerms)); // unique
      overrides = loaded.overrides;
      orgIdFromDb = loaded.orgId;
      // buforuj tylko uprawnienia roli (nie overrides) lub możesz buforować łączone
      cacheSet(userId, perms);
    } else {
      // jeśli pobrano z cache, nadal musimy pobrać overrides (mogą być rzadziej)
      const userOverrides = await prismaInstance.userPermission.findMany({
        where: { userId },
      });
      overrides = userOverrides;
      const userRow = await prismaInstance.user.findUnique({ where: { id: userId } });
      orgIdFromDb = userRow?.organizationalUnitId ?? null;
    }

    // 1) sprawdź zastąpienie dokładnego override
    const override = overrides.find(o => o.permission === requiredPermission);
    if (override) {
      if (override.allowed) return _next();
      return _next(new AppError('forbidden', 'Access explicitly denied'));
    }

    // 2) sprawdź uprawnienia roli
    if (perms.includes(requiredPermission)) {
      // opcjonalnie sprawdź zgodność jednostki organizacyjnej
      if (targetOrgId && orgIdFromDb && targetOrgId !== orgIdFromDb) {
        return _next(
          new AppError(
            'forbidden',
            'Insufficient permissions for this organizational unit'
          )
        );
      }
      return _next();
    }

    return _next(new AppError('forbidden', 'Insufficient permissions'));
  };

export const errorHandler = (
  error: Error,
  _: Request,
  response: Response,
  _next: NextFunction // eslint-disable-line no-unused-vars
) => {
  response.status('statusCode' in error ? (error.statusCode as number) : 500).json({
    message: error instanceof AppError ? error.message : 'Oops! Something went wrong...',
  });
};

export const validate =
  (schema: ZodObject<any>) =>
  async (req: Request<unknown>, _: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const invalids = error.issues.map(issue => issue.path.pop());
        next(
          new AppError(
            'validation',
            `Invalid or missing input${
              invalids.length > 1 ? 's' : ''
            } provided for: ${invalids.join(', ')}`
          )
        );
      } else {
        next(new AppError('validation', 'Invalid input'));
      }
    }
  };
