import { AuthorizationGuard } from './authorization.guard.js';
import { createMockExecutionContext } from '#tests/helpers/execution-context.helper.js';
import { PermissionsService } from '#modules/permissions/permissions.service.js';
import { ExecutionContext } from '@nestjs/common';
import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';

describe('AuthorizationGuard', () => {
  let guard: AuthorizationGuard;
  let permissionsService: jest.Mocked<PermissionsService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthorizationGuard,
        {
          provide: PermissionsService,
          useValue: {
            canAccess: jest.fn().mockResolvedValue(true as never),
          },
        },
      ],
    }).compile();

    guard = module.get(AuthorizationGuard);
    permissionsService = module.get(PermissionsService);
  });

  it('❌ should throw unauthorized error if no userId in session', async () => {
    const ctx = createMockExecutionContext({
      user: {},
    });

    await expect(guard.canActivate(ctx as ExecutionContext)).rejects.toMatchObject({
      name: 'AppError',
      message: 'Not authenticated',
      statusCode: 401,
    });
  });

  it('✅ should allow access if no permission metadata is set', async () => {
    const ctx = createMockExecutionContext({
      user: { userId: 'user-1' },
    });

    jest.spyOn(Reflect, 'getMetadata').mockReturnValue(undefined);

    await expect(guard.canActivate(ctx as ExecutionContext)).resolves.toBe(true);
  });

  it('🚫 should deny access if PermissionsService returns false', async () => {
    const ctx = createMockExecutionContext({
      user: { userId: 'user-1' },
      params: {},
      body: {},
    });

    jest.spyOn(Reflect, 'getMetadata').mockReturnValue('user.read');
    permissionsService.canAccess.mockResolvedValueOnce(false);

    await expect(guard.canActivate(ctx as ExecutionContext)).rejects.toMatchObject({
      name: 'AppError',
      message: 'Insufficient permissions',
      statusCode: 403,
    });
  });

  it('🏢 should pass targetOrgId from params to canAccess', async () => {
    const ctx = createMockExecutionContext({
      user: { userId: 'user-1' },
      params: { orgId: 'org-123' },
      body: {},
    });

    jest.spyOn(Reflect, 'getMetadata').mockReturnValue('user.manage');
    permissionsService.canAccess.mockResolvedValueOnce(true);

    await guard.canActivate(ctx as ExecutionContext);

    expect(permissionsService.canAccess).toHaveBeenCalledWith('user-1', 'user.manage', 'org-123');
  });
});
