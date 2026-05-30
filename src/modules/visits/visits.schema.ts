import { z } from 'zod';

/**
 * Schema for GET /visits query parameters.
 */
export const findAllVisitsSchema = z.object({
  orgId: z.string().uuid(),
  date: z.string().datetime().optional(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 1))
    .pipe(z.number().min(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 20))
    .pipe(z.number().min(1).max(100)),
});

export type FindAllVisitsDto = z.infer<typeof findAllVisitsSchema>;

/**
 * Schema for POST /visits body.
 */
export const createVisitSchema = z.object({
  patientId: z.string().uuid(),
  organizationalUnitId: z.string().uuid(),
  assignedToId: z.string().uuid().optional(),
  date: z.string().datetime(),
  notes: z.string().max(1000).optional(),
});

export type CreateVisitDto = z.infer<typeof createVisitSchema>;

/**
 * Schema for PATCH /visits/:id/status body.
 */
export const updateVisitStatusSchema = z.object({
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
});

export type UpdateVisitStatusDto = z.infer<typeof updateVisitStatusSchema>;

/**
 * Schema for PATCH /visits/:id body.
 */
export const updateVisitSchema = z.object({
  assignedToId: z.string().uuid().optional(),
  date: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
});

export type UpdateVisitDto = z.infer<typeof updateVisitSchema>;
