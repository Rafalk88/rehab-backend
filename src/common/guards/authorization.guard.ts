import { AppError } from '#common/errors/app.error.js';
import { PermissionsService } from '#modules/permissions/permissions.service.js';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

/**
 * AuthorizationGuard
 *
 * A NestJS Guard responsible for enforcing permission checks
 * before allowing access to route handlers.
 */
@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(private readonly permissionsService: PermissionsService = new PermissionsService()) {}

  /**
   * Validates whether the current user can access the route.
   * @throws {AppError} If unauthorized or forbidden.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.session?.userId;
    if (!userId) throw new AppError('unauthorized', 'Not authenticated');

    const requiredPermission = this.reflectPermission(context);
    if (!requiredPermission) return true; // route without permissions (e.g. login, health-check)

    const targetOrgId = req.params.orgId ?? req.body?.orgId;

    const hasAccess = await this.permissionsService.canAccess(
      userId,
      requiredPermission,
      targetOrgId,
    );

    if (!hasAccess) throw new AppError('forbidden', 'Insufficient permissions');

    return true;
  }

  /**
   * Reads required permission metadata from the route handler.
   * In real app → use @SetMetadata('permission', 'value')
   */
  private reflectPermission(context: ExecutionContext): string | undefined {
    const handler = context.getHandler();
    return Reflect.getMetadata('permission', handler);
  }
}
