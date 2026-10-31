import { AppError } from '#common/errors/app.error.js';
import { PERMISSIONS_KEY } from '#modules/permissions/decorators/permission.decorator.js';
import { type Permission } from '#modules/permissions/permissions.constants.js';
import { PermissionsService } from '#modules/permissions/permissions.service.js';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

/**
 * AuthorizationGuard
 *
 * A NestJS Guard responsible for enforcing permission checks
 * before allowing access to route handlers.
 */
@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly reflector: Reflector,
  ) {}

  /**
   * Validates whether the current user can access the route.
   * @throws {AppError} If unauthorized or forbidden.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const userId = (req as any).user?.userId;
    if (!userId) throw new AppError('unauthorized', 'Not authenticated');

    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) throw new AppError('forbidden', 'Insufficient permissions');

    const targetOrgId = req.params.orgId ?? req.body?.orgId;

    for (const permission of required) {
      const ok = await this.permissionsService.canAccess(userId, permission, targetOrgId);
      if (!ok) throw new AppError('forbidden', 'Insufficient permissions');
    }

    return true;
  }
}
