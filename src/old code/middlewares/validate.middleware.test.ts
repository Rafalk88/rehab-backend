import { validate } from './validate.middleware.js';
import { AppError } from '@errors/app.error';
import z from 'zod';

jest.mock('@utils/jwt.util');

describe('validate middleware', () => {
  const _next = jest.fn();
  const schema = z.object({
    body: z.object({ name: z.string() }),
    query: z.object({ page: z.number().optional() }),
    params: z.object({ id: z.string() }),
  });

  beforeEach(() => {
    _next.mockClear();
  });

  it('should call next if data is valid', async () => {
    const req = {
      body: { name: 'test' },
      query: {},
      params: { id: '123' },
    } as any;

    await validate(schema)(req, {} as any, _next);

    expect(_next).toHaveBeenCalledWith();
  });

  it('should call next with validation error if data invalid', async () => {
    const req = {
      body: { name: 123 }, // nieprawidłowy, powinien być string
      query: {},
      params: { id: '123' },
    } as any;

    await validate(schema)(req, {} as any, _next);

    expect(_next).toHaveBeenCalledWith(expect.any(AppError));
    const err = _next.mock.calls[0][0];
    expect(err.message).toContain('Invalid or missing input');
  });
});
