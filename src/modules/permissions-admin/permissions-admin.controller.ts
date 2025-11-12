import { AssignPermissionSchema, OverridePermissionSchema } from './permissions-admin.schemas.js';
import { PermissionsAdminService } from './permissions-admin.service.js';
import { AuthorizationGuard } from '#common/guards/authorization.guard.js';
import { ZodValidationPipe } from '#common/pipes/zod-validation.pipe.js';
import { JwtAuthGuard } from '#modules/auth/v1/guards/jwt-auth.guard.js';
import { Permissions } from '#modules/permissions/decorators/permission.decorator.js';
import { Controller, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';

interface JwtRequest extends Request {
  user?: { sub: string };
}

/**
 * PermissionsAdminController
 *
 * Provides admin endpoints for managing permissions, roles,
 * and user overrides.
 */
@Controller('permissions-admin')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class PermissionsAdminController {
  constructor(private readonly service: PermissionsAdminService) {}

  /**
   * Assign a role to a user.
   */
  @Post('users/:userId/roles/:roleId')
  @Permissions('roles_assign')
  async assignRoleToUser(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
    @Req() req: JwtRequest,
  ) {
    const adminId = req.user?.sub ?? 'system';

    return this.service.assignRoleToUser(userId, roleId, adminId);
  }

  /**
   * Assign a permission to a role.
   */
  @Post('roles/:roleId/permissions')
  @Permissions('permissions_assign')
  async assignPermissionToRole(
    @Param('roleId') roleId: string,
    @Body(new ZodValidationPipe(AssignPermissionSchema))
    body: AssignPermissionSchema,
  ) {
    return this.service.assignPermissionToRole(roleId, body);
  }

  /**
   * Override a permission for a user.
   */
  @Post('users/:userId/overrides')
  @Permissions('permissions_override')
  async overridePermissionForUser(
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(OverridePermissionSchema))
    body: OverridePermissionSchema,
  ) {
    return this.service.overridePermissionForUser(userId, body);
  }
}
