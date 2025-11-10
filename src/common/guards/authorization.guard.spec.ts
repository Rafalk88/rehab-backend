import { jest } from '@jest/globals';
import { AuthorizationGuard } from './authorization.guard.js';
import { PermissionsService } from '#modules/permissions/permissions.service.js';
import { ExecutionContext } from '@nestjs/common';

describe('AuthorizationGuard', () => {
  let guard: AuthorizationGuard;
  let permissionsService: jest.Mocked<PermissionsService>;
  let mockContext: Partial<ExecutionContext>;

  const createHttpArgsHost = (req: any) =>
    ({
      getRequest: () => req,
      getResponse: () => ({}),
      getNext: () => ({}),
    }) as any;

  beforeEach(() => {
    permissionsService = {
      canAccess: jest.fn().mockResolvedValue(true as never),
    } as unknown as jest.Mocked<PermissionsService>;

    guard = new AuthorizationGuard(permissionsService);

    mockContext = {
      switchToHttp: () => createHttpArgsHost({}),
      getHandler: () => jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('❌ should throw unauthorized error if no userId in session', async () => {
    const req = { session: {} };
    mockContext.switchToHttp = () => createHttpArgsHost(req);

    await expect(guard.canActivate(mockContext as ExecutionContext)).rejects.toMatchObject({
      name: 'AppError',
      message: 'Not authenticated',
      statusCode: 401,
    });
  });

  it('✅ should allow access if no permission metadata is set', async () => {
    const req = { session: { userId: 'user-1' } };
    mockContext.switchToHttp = () => createHttpArgsHost(req);
    jest.spyOn(Reflect, 'getMetadata').mockReturnValue(undefined);

    await expect(guard.canActivate(mockContext as ExecutionContext)).resolves.toBe(true);
  });

  it('🚫 should deny access if PermissionsService returns false', async () => {
    const req = { session: { userId: 'user-1' }, params: {}, body: {} };
    mockContext.switchToHttp = () => createHttpArgsHost(req);
    jest.spyOn(Reflect, 'getMetadata').mockReturnValue('user.read');

    permissionsService.canAccess.mockResolvedValueOnce(false);

    await expect(guard.canActivate(mockContext as ExecutionContext)).rejects.toMatchObject({
      name: 'AppError',
      message: 'Insufficient permissions',
      statusCode: 403,
    });
  });

  it('✅ should allow access if PermissionsService returns true', async () => {
    const req = { session: { userId: 'user-1' }, params: {}, body: {} };
    mockContext.switchToHttp = () => createHttpArgsHost(req);
    jest.spyOn(Reflect, 'getMetadata').mockReturnValue('user.read');

    permissionsService.canAccess.mockResolvedValueOnce(true);

    await expect(guard.canActivate(mockContext as ExecutionContext)).resolves.toBe(true);
  });

  it('🏢 should pass targetOrgId from params to canAccess', async () => {
    const req = { session: { userId: 'user-1' }, params: { orgId: 'org-123' }, body: {} };
    mockContext.switchToHttp = () => createHttpArgsHost(req);
    jest.spyOn(Reflect, 'getMetadata').mockReturnValue('user.manage');
    permissionsService.canAccess.mockResolvedValueOnce(true);

    await guard.canActivate(mockContext as ExecutionContext);

    expect(permissionsService.canAccess).toHaveBeenCalledWith('user-1', 'user.manage', 'org-123');
  });
});
