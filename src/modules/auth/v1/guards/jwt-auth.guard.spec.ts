import { JwtAuthGuard } from './jwt-auth.guard.js';
import { JwtStrategy } from '../strategies/jwt.strategy.js';
import { ExecutionContext } from '@nestjs/common';
import { jest } from '@jest/globals';

import 'dotenv/config';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    strategy = new JwtStrategy();
  });

  it('should validate and return payload', async () => {
    const payload = { sub: 'user-123', emailHmac: 'abc123hmac', emailMasked: 'a****3' };
    const result = await strategy.validate(payload);
    expect(result).toEqual({
      userId: 'user-123',
      email_hmac: 'abc123hmac',
      email_masked: 'a****3',
    });
  });
});

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let mockContext: Partial<ExecutionContext>;

  const createHttpArgsHost = (user?: any): any => ({
    getRequest: () => ({ user }),
    getResponse: () => ({}),
    getNext: () => ({}),
  });

  beforeEach(() => {
    guard = new JwtAuthGuard();
    jest.spyOn(guard, 'canActivate').mockImplementation((ctx) => {
      const request = ctx.switchToHttp().getRequest();
      return Promise.resolve(!!request.user);
    });
  });

  it('should deny access without user attached', async () => {
    mockContext = { switchToHttp: () => createHttpArgsHost(undefined) };
    await expect(guard.canActivate(mockContext as ExecutionContext)).resolves.toBeFalsy();
  });

  it('should allow access with user attached', async () => {
    mockContext = { switchToHttp: () => createHttpArgsHost({ id: 'u1' }) };
    await expect(guard.canActivate(mockContext as ExecutionContext)).resolves.toBeTruthy();
  });
});
