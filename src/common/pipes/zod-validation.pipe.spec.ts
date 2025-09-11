import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { z } from 'zod';
import { BadRequestException } from '@nestjs/common';

describe('ZodValidationPipe', () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.number().min(0),
  });

  let pipe: ZodValidationPipe;

  beforeEach(() => {
    pipe = new ZodValidationPipe(schema);
  });

  it('should return parsed value for valid input', () => {
    const input = { name: 'Alice', age: 25 };
    const result = pipe.transform(input);
    expect(result).toEqual(input);
  });

  it('should throw BadRequestException for invalid input', () => {
    const input = { name: '', age: -1 };
    expect(() => pipe.transform(input)).toThrow(BadRequestException);
  });

  it('should return error details in BadRequestException', () => {
    const input = { name: '', age: -1 };
    try {
      pipe.transform(input);
    } catch (err: any) {
      expect(err.response.errors).toHaveLength(2);
      expect(err.response.errors[0]).toHaveProperty('field');
      expect(err.response.errors[0]).toHaveProperty('message');
    }
  });
});
