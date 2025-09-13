import { ExecutionContext } from '@nestjs/common';
import { AuthorizationGuard } from './authorization.guard.js';
import { PermissionsService } from '@modules/permissions/permissions.service.js';
import { AppError } from '@common/errors/app.error.js';

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
      canAccess: jest.fn(),
    } as any;

    guard = new AuthorizationGuard(permissionsService);

    mockContext = {
      switchToHttp: () => createHttpArgsHost({}),
      getHandler: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw unauthorized error if no userId in session', async () => {
    const req = { session: {} };
    mockContext.switchToHttp = () => createHttpArgsHost(req);

    await expect(guard.canActivate(mockContext as ExecutionContext)).rejects.toThrow(
      new AppError('unauthorized', 'Not authenticated'),
    );
  });

  it('should allow access if no permission metadata is set', async () => {
    const req = { session: { userId: 'user-1' } };
    mockContext.switchToHttp = () => createHttpArgsHost(req);
    (mockContext.getHandler as jest.Mock).mockReturnValue(() => {});
    jest.spyOn(Reflect, 'getMetadata').mockReturnValue(undefined);

    await expect(guard.canActivate(mockContext as ExecutionContext)).resolves.toBe(true);
  });

  it('should deny access if PermissionsService returns false', async () => {
    const req = { session: { userId: 'user-1' }, params: {}, body: {} };
    mockContext.switchToHttp = () => createHttpArgsHost(req);
    (mockContext.getHandler as jest.Mock).mockReturnValue(() => {});
    jest.spyOn(Reflect, 'getMetadata').mockReturnValue('user.read');
    permissionsService.canAccess.mockResolvedValueOnce(false);

    await expect(guard.canActivate(mockContext as ExecutionContext)).rejects.toThrow(
      new AppError('forbidden', 'Insufficient permissions'),
    );

    expect(permissionsService.canAccess).toHaveBeenCalledWith('user-1', 'user.read', undefined);
  });

  it('should allow access if PermissionsService returns true', async () => {
    const req = { session: { userId: 'user-1' }, params: {}, body: {} };
    mockContext.switchToHttp = () => createHttpArgsHost(req);
    (mockContext.getHandler as jest.Mock).mockReturnValue(() => {});
    jest.spyOn(Reflect, 'getMetadata').mockReturnValue('user.read');
    permissionsService.canAccess.mockResolvedValueOnce(true);

    await expect(guard.canActivate(mockContext as ExecutionContext)).resolves.toBe(true);

    expect(permissionsService.canAccess).toHaveBeenCalledWith('user-1', 'user.read', undefined);
  });

  it('should pass targetOrgId from params to canAccess', async () => {
    const req = { session: { userId: 'user-1' }, params: { orgId: 'org-123' }, body: {} };
    mockContext.switchToHttp = () => createHttpArgsHost(req);
    (mockContext.getHandler as jest.Mock).mockReturnValue(() => {});
    jest.spyOn(Reflect, 'getMetadata').mockReturnValue('user.manage');
    permissionsService.canAccess.mockResolvedValueOnce(true);

    await expect(guard.canActivate(mockContext as ExecutionContext)).resolves.toBe(true);

    expect(permissionsService.canAccess).toHaveBeenCalledWith('user-1', 'user.manage', 'org-123');
  });
});
