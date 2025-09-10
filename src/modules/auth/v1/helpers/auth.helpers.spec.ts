import { Test, TestingModule } from '@nestjs/testing';
import { AuthHelpers } from '@modules/auth/v1/helpers/auth.helpers.js';
import { PrismaService } from '@/prisma/prisma.service.js';
import { verifyPassword } from '@lib/password.util.js';
import type { User } from '@prisma/client';

jest.mock('@lib/password.util.js');

describe('AuthHelpers', () => {
  let helpers: AuthHelpers;
  let prismaMock: Partial<PrismaService>;

  beforeEach(async () => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
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
    } as any; // use only those methods needed in tests and ignore rest

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthHelpers, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    helpers = module.get<AuthHelpers>(AuthHelpers);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyLoginCredentials', () => {
    it('should not throw if password is valid', async () => {
      (verifyPassword as jest.Mock).mockResolvedValue(true);
      const user: Partial<User> = {
        id: 'user-1',
        failedLoginAttempts: 0,
        passwordHash: 'hashed-pass',
      };
      await expect(
        helpers.verifyLoginCredentials(user as any, 'correct-pass'),
      ).resolves.not.toThrow();
    });

    it('should throw unauthorized if password invalid and attempts < max', async () => {
      (verifyPassword as jest.Mock).mockResolvedValue(false);
      (prismaMock.user?.update as jest.Mock).mockResolvedValueOnce({
        failedLoginAttempts: 3,
      } as any);
      (prismaMock.user?.update as jest.Mock).mockResolvedValueOnce({} as any);

      const user: Partial<User> = {
        id: 'user-1',
        failedLoginAttempts: 2,
        passwordHash: 'hashed-pass',
      };
      await expect(helpers.verifyLoginCredentials(user as any, 'wrong-pass')).rejects.toThrow(
        'Invalid login or password',
      );
    });

    it('should throw forbidden if failed attempts >= max', async () => {
      (verifyPassword as jest.Mock).mockResolvedValue(false);

      (prismaMock.user?.update as jest.Mock)
        .mockResolvedValueOnce({ failedLoginAttempts: 5 } as any)
        .mockResolvedValueOnce({} as any);

      const user: Partial<User> = {
        id: 'user-1',
        failedLoginAttempts: 5,
        passwordHash: 'hashed-pass',
      };
      await expect(helpers.verifyLoginCredentials(user as any, 'wrong-pass')).rejects.toThrow(
        /Account locked/,
      );
    });
  });

  describe('checkLoginRestrictions', () => {
    it('should throw forbidden if account inactive', () => {
      expect(() =>
        helpers.checkLoginRestrictions({
          isActive: false,
          isLocked: false,
          lockedUntil: null,
          mustChangePassword: false,
        } as any),
      ).toThrow('Account is inactive');
    });

    it('should throw forbidden if account locked with future lockedUntil', () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000);
      expect(() =>
        helpers.checkLoginRestrictions({
          isActive: true,
          isLocked: true,
          lockedUntil: futureDate,
          mustChangePassword: false,
        } as any),
      ).toThrow(/Account locked until/);
    });

    it('should throw forbidden if mustChangePassword is true', () => {
      expect(() =>
        helpers.checkLoginRestrictions({
          isActive: true,
          isLocked: false,
          lockedUntil: null,
          mustChangePassword: true,
        } as any),
      ).toThrow('Password change required before login');
    });

    it('should not throw if all checks pass', () => {
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
    it('should increment failedLoginAttempts and not lock account if below max', async () => {
      (prismaMock.user?.update as jest.Mock).mockResolvedValueOnce({
        failedLoginAttempts: 3,
      } as any);
      const result = await helpers.updateLoginFailure('user-1');
      expect(result.failedAttempts).toBe(3);
      expect(result.lockedUntil).toBeUndefined();
    });

    it('should lock account and set lockedUntil if failed attempts >= max', async () => {
      (prismaMock.user?.update as jest.Mock)
        .mockResolvedValueOnce({ failedLoginAttempts: 5 } as any)
        .mockResolvedValueOnce({} as any);

      const result = await helpers.updateLoginFailure('user-1');
      expect(result.failedAttempts).toBe(5);
      expect(result.lockedUntil).toBeInstanceOf(Date);
    });
  });

  describe('updateLoginSuccess', () => {
    it('should reset failedLoginAttempts and unlock account', async () => {
      await helpers.updateLoginSuccess('user-1');
      expect(prismaMock.user?.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: {
            lastLoginAt: expect.any(Date),
            failedLoginAttempts: 0,
            isLocked: false,
            lockedUntil: null,
          },
        }),
      );
    });
  });

  describe('getOrCreateFirstName', () => {
    it('should create first name if not exists', async () => {
      (prismaMock.givenName?.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaMock.givenName?.create as jest.Mock).mockResolvedValue({
        id: 'fn-1',
        firstName: 'alice',
      });
      const result = await helpers.getOrCreateFirstName('Alice');
      expect(result).toEqual({ id: 'fn-1', firstName: 'alice' });
    });
  });

  describe('getOrCreateSurname', () => {
    it('should create surname if not exists', async () => {
      (prismaMock.givenName?.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaMock.givenName?.create as jest.Mock).mockResolvedValue({
        id: 's-1',
        surname: 'smith',
      });
      const result = await helpers.getOrCreateSurname('Smith');
      expect(result).toEqual({ id: 's-1', surname: 'smith' });
    });
  });

  describe('generateUniqueLogin', () => {
    it('should generate login without suffix if unique', async () => {
      (prismaMock.user?.findUnique as jest.Mock).mockResolvedValue(null);
      const login = await helpers.generateUniqueLogin('Alice', 'Smith');
      expect(login).toBe('asmith');
    });

    it('should append suffix if login exists', async () => {
      (prismaMock.user?.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'user-1' })
        .mockResolvedValueOnce(null);
      const login = await helpers.generateUniqueLogin('Alice', 'Smith');
      expect(login).toBe('asmith1');
    });
  });
});
