import { ZodValidationPipe } from './zod-validation.pipe.js';
import { AppError } from '../errors/app.error.js';
import { z } from 'zod';

describe('ZodValidationPipe', () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.number().min(0),
  });

  let pipe: ZodValidationPipe<z.infer<typeof schema>>;

  beforeEach(() => {
    pipe = new ZodValidationPipe(schema);
  });

  it('should return parsed value for valid input', () => {
    const input = { name: 'Alice', age: 25 };
    const result = pipe.transform(input);
    expect(result).toEqual(input);
  });

  it('should throw AppError for invalid input', () => {
    const input = { name: '', age: -1 };
    expect(() => pipe.transform(input)).toThrow(AppError);
  });

  it('should return error details in AppError', () => {
    const input = { name: '', age: -1 };

    try {
      pipe.transform(input);
    } catch (err: any) {
      expect(err.details).toHaveLength(2);
      expect(err.details[0]).toHaveProperty('field');
      expect(err.details[0]).toHaveProperty('message');
    }
  });
});
