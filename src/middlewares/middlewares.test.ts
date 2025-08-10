import { authentication, authorization, validate, permCache } from './middlewares';
import { verifyToken } from '@utils/jwt';
import { AppError } from '@utils/utilityClasses';
import { prismaMock } from '../singleton';
import z from 'zod';

jest.mock('@utils/jwt');

describe('authentication middleware', () => {
  const _next = jest.fn();

  beforeEach(() => {
    _next.mockClear();
    (verifyToken as jest.Mock).mockReset();
  });

  it('should allow OPTIONS requests without auth', () => {
    const req = { method: 'OPTIONS', headers: {} } as any;
    const res = { send: jest.fn() } as any;

    authentication(req, res, _next);

    expect(res.send).toHaveBeenCalledWith({ message: 'Preflight check successful.' });
    expect(_next).not.toHaveBeenCalled();
  });

  it('should throw error if no Authorization header', () => {
    const req = { method: 'POST', headers: {} } as any;
    const res = {} as any;

    authentication(req, res, _next);

    expect(_next).toHaveBeenCalledWith(expect.any(AppError));
    const err = _next.mock.calls[0][0];
    expect(err.message).toContain('Authorization');
  });

  it('should throw error if Authorization does not start with Bearer', () => {
    const req = { method: 'POST', headers: { authorization: 'Basic token' } } as any;
    const res = {} as any;

    authentication(req, res, _next);

    expect(_next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('should call next with error if token is invalid', () => {
    (verifyToken as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid');
    });
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer invalid_token' },
    } as any;
    const res = {} as any;

    authentication(req, res, _next);

    expect(_next).toHaveBeenCalledWith(expect.any(AppError));
    expect(_next.mock.calls[0][0].message).toContain('Invalid access token');
  });

  it('should set session.userId and call next for valid token', () => {
    (verifyToken as jest.Mock).mockReturnValue('user-123');
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer valid_token' },
    } as any;
    const res = {} as any;

    authentication(req, res, _next);

    expect(req.session.userId).toBe('user-123');
    expect(_next).toHaveBeenCalledWith();
  });
});

describe('authorization middleware', () => {
  const _next = jest.fn();
  const mockReq = (userId: string | undefined, params = {}, body = {}) =>
    ({
      session: { userId },
      params,
      body,
    } as any);

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

    const middleware = authorization(
      'perm:test',
      { matchOrgUnitParam: 'orgId' },
      prismaMock
    );
    const req = mockReq('user1', { orgId: 'org2' });

    await middleware(req, {} as any, _next);

    expect(_next).toHaveBeenCalledWith(expect.any(AppError));
    expect(_next.mock.calls[0][0].message).toMatch(/organizational unit/);
  });
});

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
