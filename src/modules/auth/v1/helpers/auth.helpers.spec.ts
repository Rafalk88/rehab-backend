import { jest } from '@jest/globals';

const { PrismaService } = await import('#prisma/prisma.service.js');

await jest.unstable_mockModule('#lib/password.util.js', () => ({
  verifyPassword: jest.fn(),
}));

const passwordUtil = await import('#lib/password.util.js');
const { AuthHelpers } = await import('./auth.helpers.js');
const { Test } = await import('@nestjs/testing');

const verifyPasswordMock = passwordUtil.verifyPassword as jest.MockedFunction<
  typeof passwordUtil.verifyPassword
>;

import 'dotenv/config';

describe('AuthHelpers', () => {
  let helpers: InstanceType<typeof AuthHelpers>;
  let prismaMock: jest.Mocked<Partial<InstanceType<typeof PrismaService>>>;

  beforeEach(async () => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      givenName: { findFirst: jest.fn(), create: jest.fn() },
      surname: { findFirst: jest.fn(), create: jest.fn() },
    } as any;

    const module = await Test.createTestingModule({
      providers: [AuthHelpers, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    helpers = module.get(AuthHelpers);
  });

  afterEach(() => jest.clearAllMocks());

  describe('verifyLoginCredentials', () => {
    it('✅ passes when password is valid', async () => {
      verifyPasswordMock.mockResolvedValue(true);
      const user = { id: '1', failedLoginAttempts: 0, passwordHash: 'hash' } as any;
      await expect(helpers.verifyLoginCredentials(user, 'secret')).resolves.not.toThrow();
    });

    it('❌ throws unauthorized when password invalid (below lock threshold)', async () => {
      verifyPasswordMock.mockResolvedValue(false);
      (prismaMock.user!.update as jest.Mock).mockResolvedValueOnce({
        failedLoginAttempts: 3,
      } as never);
      const user = { id: '1', failedLoginAttempts: 2, passwordHash: 'hash' } as any;

      await expect(helpers.verifyLoginCredentials(user, 'wrong')).rejects.toThrow(
        /Invalid login or password/,
      );
    });

    it('🔒 throws forbidden when failed attempts >= max', async () => {
      verifyPasswordMock.mockResolvedValue(false);
      (prismaMock.user!.update as jest.Mock)
        .mockResolvedValueOnce({ failedLoginAttempts: 5 } as never)
        .mockResolvedValueOnce({} as never);
      const user = { id: '1', failedLoginAttempts: 5, passwordHash: 'hash' } as any;

      await expect(helpers.verifyLoginCredentials(user, 'wrong')).rejects.toThrow(/Account locked/);
    });
  });

  describe('checkLoginRestrictions', () => {
    it('inactive → forbidden', () => {
      expect(() =>
        helpers.checkLoginRestrictions({
          isActive: false,
          isLocked: false,
          lockedUntil: null,
          mustChangePassword: false,
        } as any),
      ).toThrow(/inactive/);
    });

    it('locked with future lockedUntil → forbidden', () => {
      const future = new Date(Date.now() + 60_000);
      expect(() =>
        helpers.checkLoginRestrictions({
          isActive: true,
          isLocked: true,
          lockedUntil: future,
          mustChangePassword: false,
        } as any),
      ).toThrow(/locked until/);
    });

    it('mustChangePassword → forbidden', () => {
      expect(() =>
        helpers.checkLoginRestrictions({
          isActive: true,
          isLocked: false,
          lockedUntil: null,
          mustChangePassword: true,
        } as any),
      ).toThrow(/Password change required/);
    });

    it('✅ passes when active and unlocked', () => {
      expect(() =>
        helpers.checkLoginRestrictions({
          isActive: true,
          isLocked: false,
          lockedUntil: null,
          mustChangePassword: false,
        } as any),
      ).not.toThrow();
    });
  });

  describe('updateLoginFailure', () => {
    it('increments attempts (no lock)', async () => {
      (prismaMock.user!.update as jest.Mock).mockResolvedValueOnce({
        failedLoginAttempts: 3,
      } as never);
      const res = await helpers.updateLoginFailure('1');
      expect(res.failedAttempts).toBe(3);
      expect(res.lockedUntil).toBeUndefined();
    });

    it('locks when attempts >= 5', async () => {
      (prismaMock.user!.update as jest.Mock)
        .mockResolvedValueOnce({ failedLoginAttempts: 5 } as never)
        .mockResolvedValueOnce({} as never);
      const res = await helpers.updateLoginFailure('1');
      expect(res.failedAttempts).toBe(5);
      expect(res.lockedUntil).toBeInstanceOf(Date);
    });
  });

  describe('updateLoginSuccess', () => {
    it('resets login state', async () => {
      await helpers.updateLoginSuccess('1');
      expect(prismaMock.user!.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
          data: expect.objectContaining({
            failedLoginAttempts: 0,
            isLocked: false,
            lockedUntil: null,
          }),
        }),
      );
    });
  });

  describe('getOrCreateFirstName', () => {
    it('creates when not found', async () => {
      (prismaMock.givenName!.findFirst as jest.Mock).mockResolvedValue(null as never);
      (prismaMock.givenName!.create as jest.Mock).mockResolvedValue({
        id: 'f1',
        firstName: 'alice',
      } as never);
      const res = await helpers.getOrCreateFirstName('Alice');
      expect(res).toEqual({ id: 'f1', firstName: 'alice' });
    });
  });

  describe('getOrCreateSurname', () => {
    it('creates when not found', async () => {
      (prismaMock.surname!.findFirst as jest.Mock).mockResolvedValue(null as never);
      (prismaMock.surname!.create as jest.Mock).mockResolvedValue({
        id: 's1',
        surname: 'smith',
      } as never);
      const res = await helpers.getOrCreateSurname('Smith');
      expect(res).toEqual({ id: 's1', surname: 'smith' });
    });
  });

  describe('generateUniqueLogin', () => {
    it('returns base login if unique', async () => {
      (prismaMock.user!.findUnique as jest.Mock).mockResolvedValue(null as never);
      const res = await helpers.generateUniqueLogin('Alice', 'Smith');
      expect(res).toBe('asmith');
    });

    it('adds numeric suffix if taken', async () => {
      (prismaMock.user!.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'existing' } as never)
        .mockResolvedValueOnce(null as never);
      const res = await helpers.generateUniqueLogin('Alice', 'Smith');
      expect(res).toBe('asmith1');
    });
  });
});
