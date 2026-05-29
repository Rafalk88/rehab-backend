import { z } from 'zod';

/**
 * Schema for GET /patients query parameters.
 * Validates pagination input before it reaches the service.
 */
export const findAllPatientsSchema = z.object({
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
  orgId: z.string().uuid().optional(),
});

export type FindAllPatientsDto = z.infer<typeof findAllPatientsSchema>;

/**
 * Schema for POST /patients body.
 * Validates patient creation input.
 */
export const createPatientSchema = z.object({
  pesel: z
    .string()
    .length(11)
    .regex(/^\d{11}$/, 'PESEL must contain 11 digits'),
  firstName: z.string().min(1).max(50),
  secondName: z.string().min(1).max(50).optional(),
  surname: z.string().min(1).max(50),
  dateOfBirth: z.string().datetime(),
  sexId: z.string().uuid().optional(),
  peselStatus: z
    .enum(['ASSIGNED', 'UNASSIGNED', 'UNKNOWN', 'NEWBORN', 'FOREIGNER_EU', 'FOREIGNER_NON_EU'])
    .default('ASSIGNED'),
});

export type CreatePatientDto = z.infer<typeof createPatientSchema>;
