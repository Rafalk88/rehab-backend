import { type Permission } from '#modules/permissions/permissions.constants.js';
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * @Permissions decorator
 * Marks a route with the required permission string.
 *
 * Usage:
 *   @Permissions(PERMISSIONS.USERS.READ)
 */
export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
