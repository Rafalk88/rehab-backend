import { z } from 'zod';

/**
 * CreatePermissionSchema
 * Used for creating a new system permission.
 */
export const CreatePermissionSchema = z.object({
  permission: z
    .string()
    .min(3, 'Permission must be at least 3 characters long')
    .max(100, 'Permission cannot exceed 100 characters')
    .regex(/^[a-z0-9_]+$/, 'Permission must be lowercase and use only _'),
  description: z.string().optional(),
});
export type CreatePermissionSchema = z.infer<typeof CreatePermissionSchema>;

/**
 * AssignPermissionSchema
 * Used for assigning a permission to a role.
 */
export const AssignPermissionSchema = z.object({
  permission: z.string().min(3, 'Permission is required'),
});
export type AssignPermissionSchema = z.infer<typeof AssignPermissionSchema>;

/**
 * OverridePermissionSchema
 * Used for overriding a permission for a user.
 */
export const OverridePermissionSchema = z.object({
  permission: z.string().min(3, 'Permission is required'),
  allowed: z.boolean(),
});
export type OverridePermissionSchema = z.infer<typeof OverridePermissionSchema>;
