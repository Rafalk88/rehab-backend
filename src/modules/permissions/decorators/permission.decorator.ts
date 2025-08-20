import { SetMetadata } from '@nestjs/common';

/**
 * @Permissions decorator
 * Marks a route with the required permission string.
 *
 * Usage:
 *   @Permissions('user.read')
 */
export const Permissions = (permission: string) => SetMetadata('permission', permission);
