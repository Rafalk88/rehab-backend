import { Test, TestingModule } from '@nestjs/testing';
import { AuthHelpers } from '@modules/auth/v1/helpers/auth.helpers.js';
import { PrismaService } from '@/prisma/prisma.service.js';
import { verifyPassword } from '@lib/password.util.js';
import type { User } from '@prisma/client';

jest.mock('@lib/password.util.js');

describe('AuthHelpers', () => {
  let helpers: AuthHelpers;
  let prismaMock: jest.Mocked<Partial<PrismaService>>;

  beforeEach(async () => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      givenName: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      surname: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthHelpers, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    helpers = module.get<AuthHelpers>(AuthHelpers);
  });

  afterEach(() => jest.clearAllMocks());

  describe('verifyLoginCredentials', () => {
    it('✅ passes when password is valid', async () => {
      (verifyPassword as jest.Mock).mockResolvedValue(true);
      const user = { id: '1', failedLoginAttempts: 0, passwordHash: 'hash' } as User;
      await expect(helpers.verifyLoginCredentials(user, 'secret')).resolves.not.toThrow();
    });

    it('❌ throws unauthorized when password invalid (below lock threshold)', async () => {
      (verifyPassword as jest.Mock).mockResolvedValue(false);
      (prismaMock.user!.update as jest.Mock).mockResolvedValueOnce({ failedLoginAttempts: 3 }); // first update
      const user = { id: '1', failedLoginAttempts: 2, passwordHash: 'hash' } as User;
      await expect(helpers.verifyLoginCredentials(user, 'wrong')).rejects.toThrow(/unauthorized/);
    });

    it('🔒 throws forbidden when failed attempts >= max', async () => {
      (verifyPassword as jest.Mock).mockResolvedValue(false);
      (prismaMock.user!.update as jest.Mock)
        .mockResolvedValueOnce({ failedLoginAttempts: 5 }) // increment
        .mockResolvedValueOnce({}); // lock call
      const user = { id: '1', failedLoginAttempts: 5, passwordHash: 'hash' } as User;
      await expect(helpers.verifyLoginCredentials(user, 'wrong')).rejects.toThrow(/forbidden/);
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
      });
      const res = await helpers.updateLoginFailure('1');
      expect(res.failedAttempts).toBe(3);
      expect(res.lockedUntil).toBeUndefined();
    });

    it('locks when attempts >= 5', async () => {
      (prismaMock.user!.update as jest.Mock)
        .mockResolvedValueOnce({ failedLoginAttempts: 5 })
        .mockResolvedValueOnce({});
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
      (prismaMock.givenName!.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaMock.givenName!.create as jest.Mock).mockResolvedValue({
        id: 'f1',
        firstName: 'alice',
      });
      const res = await helpers.getOrCreateFirstName('Alice');
      expect(res).toEqual({ id: 'f1', firstName: 'alice' });
    });
  });

  describe('getOrCreateSurname', () => {
    it('creates when not found', async () => {
      (prismaMock.surname!.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaMock.surname!.create as jest.Mock).mockResolvedValue({
        id: 's1',
        surname: 'smith',
      });
      const res = await helpers.getOrCreateSurname('Smith');
      expect(res).toEqual({ id: 's1', surname: 'smith' });
    });
  });

  describe('generateUniqueLogin', () => {
    it('returns base login if unique', async () => {
      (prismaMock.user!.findUnique as jest.Mock).mockResolvedValue(null);
      const res = await helpers.generateUniqueLogin('Alice', 'Smith');
      expect(res).toBe('asmith');
    });

    it('adds numeric suffix if taken', async () => {
      (prismaMock.user!.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'existing' })
        .mockResolvedValueOnce(null);
      const res = await helpers.generateUniqueLogin('Alice', 'Smith');
      expect(res).toBe('asmith1');
    });
  });
});
