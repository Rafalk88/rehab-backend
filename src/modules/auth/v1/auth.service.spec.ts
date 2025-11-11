import { jest } from '@jest/globals';

import { AppError } from '#common/errors/app.error.js';
const { PrismaService } = await import('#prisma/prisma.service.js');
await jest.unstable_mockModule('#lib/password.util.js', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed-password' as never),
  verifyPassword: jest.fn(),
}));

jest.unstable_mockModule('#lib/encryption.util.js', () => ({
  computeHmac: jest.fn((s) => `hmac-${s}`),
  aesGcmEncrypt: jest.fn((s) => `enc-${s}`),
  maskString: jest.fn((s) => `mask-${s}`),
}));

const encryptionUtil = await import('#lib/encryption.util.js');
const { computeHmac, aesGcmEncrypt, maskString } = encryptionUtil;

const passwordUtil = await import('#lib/password.util.js');
const { verifyPassword } = passwordUtil;
const { AuthService } = await import('./auth.service.js');
const { AuthHelpers } = await import('./helpers/auth.helpers.js');
const { DbLoggerService } = await import('#lib/DbLoggerService.js');
const { JwtService } = await import('@nestjs/jwt');
const { Test } = await import('@nestjs/testing');
const { RequestContextService } = await import('#context/request-context.service.js');

import 'dotenv/config';

describe('AuthService', () => {
  let service: InstanceType<typeof AuthService>;
  let prisma: jest.Mocked<InstanceType<typeof PrismaService>>;
  let helpers: jest.Mocked<InstanceType<typeof AuthHelpers>>;
  let jwtService: jest.Mocked<InstanceType<typeof JwtService>>;
  let dbLogger: jest.Mocked<InstanceType<typeof DbLoggerService>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
            refreshToken: {
              findMany: jest.fn(),
              delete: jest.fn(),
              deleteMany: jest.fn(),
              create: jest.fn(),
              createMany: jest.fn(),
            },
            blacklistedToken: { findUnique: jest.fn(), create: jest.fn(), createMany: jest.fn() },
            passwordHistory: { findMany: jest.fn(), create: jest.fn(), delete: jest.fn() },
          },
        },
        {
          provide: AuthHelpers,
          useValue: {
            getOrCreateFirstName: jest.fn().mockResolvedValue({ id: 'fname-1' } as never),
            getOrCreateSurname: jest.fn().mockResolvedValue({ id: 'sname-1' } as never),
            generateUniqueLogin: jest.fn().mockResolvedValue('jsmith' as never),
            verifyLoginCredentials: jest.fn(),
            checkLoginRestrictions: jest.fn(),
            updateLoginSuccess: jest.fn(),
            generateTemporaryPassword: jest.fn().mockReturnValue('TempPass123!'),
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('signed-jwt-token') },
        },
        {
          provide: DbLoggerService,
          useValue: { logAction: jest.fn().mockResolvedValue(undefined as never) },
        },
        {
          provide: RequestContextService,
          useValue: {
            get: jest.fn().mockReturnValue({
              userId: 'user-1',
              ipAddress: '127.0.0.1',
            }),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    prisma = module.get(PrismaService);
    helpers = module.get(AuthHelpers);
    jwtService = module.get(JwtService);
    dbLogger = module.get(DbLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    it('✅ creates new user with encrypted fields', async () => {
      (prisma.user.create as jest.Mock).mockResolvedValueOnce({ id: 'user-1' } as never);

      const result = await service.registerUser({
        firstName: 'John',
        surname: 'Smith',
        password: 'P@ssw0rd123',
      });

      expect(helpers.getOrCreateFirstName).toHaveBeenCalledWith('John');
      expect(helpers.getOrCreateSurname).toHaveBeenCalledWith('Smith');
      expect(helpers.generateUniqueLogin).toHaveBeenCalledWith('John', 'Smith');

      expect(computeHmac).toHaveBeenCalledWith('jsmith', 1);
      expect(aesGcmEncrypt).toHaveBeenCalledWith('jsmith', 1);
      expect(maskString).toHaveBeenCalledWith('jsmith');

      expect(computeHmac).toHaveBeenCalledWith('jsmith@vitala.com', 1);
      expect(aesGcmEncrypt).toHaveBeenCalledWith('jsmith@vitala.com', 1);
      expect(maskString).toHaveBeenCalledWith('jsmith@vitala.com');

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            loginHmac: 'hmac-jsmith',
            loginEncrypted: 'enc-jsmith',
            loginMasked: 'mask-jsmith',
            emailHmac: 'hmac-jsmith@vitala.com',
            emailEncrypted: 'enc-jsmith@vitala.com',
            emailMasked: 'mask-jsmith@vitala.com',
            passwordHash: 'hashed-password',
          }),
        }),
      );

      expect(result).toEqual({
        user: { id: 'user-1' },
        login: 'jsmith',
      });
    });
  });

  describe('loginUser', () => {
    it('✅ logs successful login and returns access + refresh tokens', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'user-1',
        loginHmac: 'jdoe',
        loginEncrypted: 'enc-jdoe',
        loginMasked: 'mask-jdoe',
        emailHmac: 'hmac-jdoe@vitala.com',
        emailEncrypted: 'enc-jdoe@vitala.com',
        emailMasked: 'mask-jdoe@vitala.com',
        passwordHash: 'hashed-pass',
        failedLoginAttempts: 0,
        isActive: true,
        isLocked: false,
        lockedUntil: null,
        mustChangePassword: false,
      } as never);

      (jwtService.sign as jest.Mock)
        .mockReturnValueOnce('mock-access-token')
        .mockReturnValueOnce('mock-refresh-token');

      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({} as never);

      const result = await service.loginUser('jdoe', 'correct-pass');

      expect(dbLogger.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'login',
          entityType: 'User',
          entityId: 'user-1',
        }),
      );

      expect(result).toEqual({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
      });

      expect(prisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            tokenHash: expect.any(String),
            expiresAt: expect.any(Date),
          }),
        }),
      );
    });

    it('❌ throws when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null as never);

      await expect(service.loginUser('jdoe', 'wrong-pass')).rejects.toThrow(AppError);

      await expect(service.loginUser('jdoe', 'wrong-pass')).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid login or password',
      });
    });
  });

  describe('logoutUser', () => {
    it('✅ logs out user and logs operation', async () => {
      (prisma.refreshToken.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'token-1',
          tokenHash: 'hashed-token',
          expiresAt: new Date(Date.now() + 1000 * 60),
          user: { id: 'user-1', login: 'jdoe' },
        },
      ] as never);

      (verifyPassword as jest.Mock).mockResolvedValue(true as never);
      (prisma.blacklistedToken.createMany as jest.Mock).mockResolvedValue({} as never);
      (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({} as never);
      (dbLogger.logAction as jest.Mock).mockResolvedValue({} as never);

      const result = await service.logoutUser();

      expect(prisma.blacklistedToken.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([expect.objectContaining({ userId: 'user-1' })]),
        }),
      );

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );

      expect(dbLogger.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'logout',
          entityType: 'User',
          entityId: 'user-1',
        }),
      );

      expect(result).toEqual({ message: 'Successfully logged out' });
    });

    it('❌ throws if token not found', async () => {
      (prisma.refreshToken.findMany as jest.Mock).mockResolvedValue([] as never);

      await expect(service.logoutUser()).rejects.toThrow(AppError);

      await expect(service.logoutUser()).rejects.toMatchObject({
        statusCode: 401,
        message: 'No active tokens found',
      });
    });
  });

  describe('refreshTokens', () => {
    it('✅ refreshes successfully', async () => {
      (prisma.refreshToken.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'token-1',
          tokenHash: 'hashed-token',
          expiresAt: new Date(Date.now() + 1000 * 60),
          user: { id: 'user-1', email: 'jdoe@vitala.com' },
        },
      ] as never);

      (verifyPassword as jest.Mock).mockResolvedValue(true as never);
      (prisma.blacklistedToken.findUnique as jest.Mock).mockResolvedValue(null as never);
      (prisma.blacklistedToken.create as jest.Mock).mockResolvedValue({} as never);
      (prisma.refreshToken.delete as jest.Mock).mockResolvedValue({} as never);
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({} as never);

      const result = await service.refreshTokens('mock-refresh-token');

      expect(result).toEqual({
        access_token: 'signed-jwt-token',
        refresh_token: 'signed-jwt-token',
      });
    });
  });

  describe('changePassword', () => {
    const userId = 'user-1';
    const ipAddress = '127.0.0.1';

    it('✅ changes password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: userId,
        passwordHash: 'old-hash',
        mustChangePassword: true,
      } as never);

      (prisma.passwordHistory.findMany as jest.Mock).mockResolvedValue([] as never);
      (verifyPassword as jest.Mock).mockResolvedValue(true as never);
      (prisma.user.update as jest.Mock).mockResolvedValue({} as never);
      (prisma.passwordHistory.create as jest.Mock).mockResolvedValue({} as never);
      (dbLogger.logAction as jest.Mock).mockResolvedValue(undefined as never);

      const result = await service.changePassword(
        userId,
        'OldPass123!',
        'NewPass456!',
        'NewPass456!',
      );

      expect(result).toEqual({ message: 'Password changed successfully' });
    });

    it('❌ throws if old password incorrect', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: userId,
        passwordHash: 'old-hash',
      } as never);
      (verifyPassword as jest.Mock).mockResolvedValue(false as never);

      await expect(
        service.changePassword(userId, 'WrongOldPass', 'NewPass456!', 'NewPass456!'),
      ).rejects.toMatchObject({ statusCode: 401, message: 'Old password is incorrect' });
    });

    it('❌ throws if new passwords mismatch', async () => {
      await expect(
        service.changePassword(userId, 'OldPass123!', 'NewPass1', 'NewPass2'),
      ).rejects.toMatchObject({ statusCode: 400, message: 'New passwords do not match' });
    });
  });
});
