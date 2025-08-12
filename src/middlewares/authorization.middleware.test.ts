import { authorization } from './authorization.middleware';
import { permCache } from './permissions.cache';
import { AppError } from '@errors/app.error';
import { prismaMock } from '@/__mocks__/prismaClient';

jest.mock('@utils/jwt.util');

describe('authorization middleware', () => {
  const _next = jest.fn();
  const mockReq = (userId: string | undefined, params = {}, body = {}) =>
    ({
      session: { userId },
      params,
      body,
    }) as any;

  beforeEach(() => {
    permCache.clear();
    _next.mockClear();
    jest.clearAllMocks();
  });

  it('should return unauthorized if no userId in session', async () => {
    const middleware = authorization('perm:test', undefined, prismaMock);
    await middleware(mockReq(undefined), {} as any, _next);

    expect(_next).toHaveBeenCalledWith(expect.any(AppError));
    expect(_next.mock.calls[0][0].message).toMatch(/Not authenticated/);
  });

  it('should allow access if user has required permission', async () => {
    // Mock Prisma w celu zwrócenia uprawnień z żądaną perm
    (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user1',
      organizationalUnitId: 'org1',
      userRoles: [
        {
          role: {
            rolePermissions: [{ permission: 'perm:test' }],
          },
        },
      ],
      userPermissions: [],
    });
    (prismaMock.userPermission.findMany as jest.Mock).mockResolvedValue([]);

    const middleware = authorization('perm:test', undefined, prismaMock);
    await middleware(mockReq('user1'), {} as any, _next);

    expect(_next).toHaveBeenCalledWith();
  });

  it('should deny access if user does not have permission', async () => {
    (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user1',
      organizationalUnitId: 'org1',
      userRoles: [
        {
          role: {
            rolePermissions: [{ permission: 'perm:other' }], // brak perm:test
          },
        },
      ],
      userPermissions: [],
    });
    (prismaMock.userPermission.findMany as jest.Mock).mockResolvedValue([]);

    const middleware = authorization('perm:test', undefined, prismaMock);
    await middleware(mockReq('user1'), {} as any, _next);

    expect(_next).toHaveBeenCalledWith(expect.any(AppError));
    expect(_next.mock.calls[0][0].message).toMatch(/Insufficient permissions/);
  });

  it('should deny access if override denies permission', async () => {
    (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user1',
      organizationalUnitId: 'org1',
      userRoles: [
        {
          role: {
            rolePermissions: [{ permission: 'perm:test' }],
          },
        },
      ],
      userPermissions: [{ permission: 'perm:test', allowed: false }],
    });
    (prismaMock.userPermission.findMany as jest.Mock).mockResolvedValue([
      { permission: 'perm:test', allowed: false },
    ]);

    const middleware = authorization('perm:test', undefined, prismaMock);
    await middleware(mockReq('user1'), {} as any, _next);

    expect(_next).toHaveBeenCalledWith(expect.any(AppError));
    expect(_next.mock.calls[0][0].message).toMatch(/explicitly denied/);
  });

  it('should check organizational unit if matchOrgUnitParam is set', async () => {
    (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user1',
      organizationalUnitId: 'org1',
      userRoles: [
        {
          role: {
            rolePermissions: [{ permission: 'perm:test' }],
          },
        },
      ],
      userPermissions: [],
    });
    (prismaMock.userPermission.findMany as jest.Mock).mockResolvedValue([]);

    const middleware = authorization('perm:test', { matchOrgUnitParam: 'orgId' }, prismaMock);
    const req = mockReq('user1', { orgId: 'org2' });

    await middleware(req, {} as any, _next);

    expect(_next).toHaveBeenCalledWith(expect.any(AppError));
    expect(_next.mock.calls[0][0].message).toMatch(/organizational unit/);
  });
});
