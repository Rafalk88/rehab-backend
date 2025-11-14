import { AppError } from '#common/errors/app.error.js';
import { PipeTransform, Injectable } from '@nestjs/common';
import type { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const errors = result.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      throw new AppError('validation', 'Validation failed', errors);
    }
    return result.data;
  }
}
