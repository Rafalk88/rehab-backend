import { AuthorizationGuard } from './authorization.guard.js';
import { createMockExecutionContext } from '#tests/helpers/execution-context.helper.js';
import { PERMISSIONS } from '#modules/permissions/permissions.constants.js';
import { PermissionsService } from '#modules/permissions/permissions.service.js';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';

describe('AuthorizationGuard', () => {
  let guard: AuthorizationGuard;
  let permissionsService: jest.Mocked<PermissionsService>;
  let reflector: { getAllAndOverride: jest.Mock };

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
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get(AuthorizationGuard);
    permissionsService = module.get(PermissionsService);
    reflector = module.get(Reflector);
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

  it('❌ should throw forbidden error if no permission metadata is set', async () => {
    const ctx = createMockExecutionContext({
      user: { userId: 'user-1' },
    });

    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(guard.canActivate(ctx as ExecutionContext)).rejects.toMatchObject({
      name: 'AppError',
      message: 'Insufficient permissions',
      statusCode: 403,
    });
  });

  it('🚫 should deny access if PermissionsService returns false', async () => {
    const ctx = createMockExecutionContext({
      user: { userId: 'user-1' },
      params: {},
      body: {},
    });

    reflector.getAllAndOverride.mockReturnValue([PERMISSIONS.USERS.READ]);
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

    reflector.getAllAndOverride.mockReturnValue([PERMISSIONS.USERS.UPDATE]);

    await guard.canActivate(ctx as ExecutionContext);

    expect(permissionsService.canAccess).toHaveBeenCalledWith('user-1', 'users.update', 'org-123');
  });

  it('🔒 should deny if any of multiple permissions is missing', async () => {
    const ctx = createMockExecutionContext({ user: { userId: 'user-1' }, params: {}, body: {} });
    reflector.getAllAndOverride.mockReturnValue([PERMISSIONS.USERS.READ, PERMISSIONS.ROLES.ASSIGN]);
    permissionsService.canAccess.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await expect(guard.canActivate(ctx as ExecutionContext)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(permissionsService.canAccess).toHaveBeenCalledTimes(2);
  });
});
