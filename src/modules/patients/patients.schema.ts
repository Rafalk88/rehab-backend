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
});

export type FindAllPatientsDto = z.infer<typeof findAllPatientsSchema>;
