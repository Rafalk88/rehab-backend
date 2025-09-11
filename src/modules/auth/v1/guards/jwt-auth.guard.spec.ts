import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/v1/guards/jwt-auth.guard.js';
import { JwtStrategy } from '@modules/auth/v1/strategies/jwt.strategy.js';
import { HttpArgumentsHost } from '@nestjs/common/interfaces/index.js';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    strategy = new JwtStrategy();
  });

  it('should validate and return payload', async () => {
    const payload = { sub: 'user-123', email: 'test@example.com' };
    const result = await strategy.validate(payload);
    expect(result).toEqual({ userId: 'user-123', email: 'test@example.com' });
  });
});

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let mockContext: Partial<ExecutionContext>;

  const createHttpArgsHost = (user?: any): HttpArgumentsHost => ({
    getRequest: <T>() => ({ user, headers: {} }) as T,
    getResponse: <T>() => ({}) as T,
    getNext: <T>() => ({}) as T,
  });

  beforeEach(() => {
    guard = new JwtAuthGuard();
    mockContext = {
      switchToHttp: () => createHttpArgsHost(undefined),
    };
  });

  it('should deny access without user attached', async () => {
    await expect(guard.canActivate(mockContext as ExecutionContext)).resolves.toBeFalsy();
  });

  it('should allow access with user attached', async () => {
    mockContext.switchToHttp = () =>
      createHttpArgsHost({ userId: 'user-123', email: 'test@example.com' });

    await expect(guard.canActivate(mockContext as ExecutionContext)).resolves.toBeTruthy();
  });
});
