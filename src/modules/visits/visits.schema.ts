import { VisitStatus } from '#generated/prisma/index.js';
import { z } from 'zod';

/**
 * Schema for GET /visits query parameters.
 */
export const findAllVisitsSchema = z.object({
  orgId: z.string().uuid(),
  dateFrom: z.iso.date().optional(),
  dateTo: z.iso.date().optional(),
  status: z.enum(VisitStatus).optional(),
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
  plannedDate: z.iso.date().optional(),
  registerDate: z.iso.date().optional(),
  completionDate: z.iso.date().optional(),
  notes: z.string().max(1000).optional(),
  status: z.enum(VisitStatus).optional(),
});

export type CreateVisitDto = z.infer<typeof createVisitSchema>;

/**
 * Schema for PATCH /visits/:id/status body.
 */
export const updateVisitStatusSchema = z.object({
  status: z.enum(VisitStatus),
});

export type UpdateVisitStatusDto = z.infer<typeof updateVisitStatusSchema>;

/**
 * Schema for PATCH /visits/:id body.
 */
export const updateVisitSchema = z.object({
  assignedToId: z.string().uuid().optional(),
  plannedDate: z.iso.date().optional(),
  registerDate: z.iso.date().optional(),
  completionDate: z.iso.date().optional(),
  status: z.enum(VisitStatus).optional(),
  ewusVerifiedAt: z.iso.datetime().optional(),
  billed: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
});

export type UpdateVisitDto = z.infer<typeof updateVisitSchema>;
