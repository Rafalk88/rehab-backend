import { jest } from '@jest/globals';

// ✅ ESM mocks
await jest.unstable_mockModule('#lib/password.util.js', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed-password' as never),
  verifyPassword: jest.fn(),
}));

// ✅ dynamiczne importy po mockach
const passwordUtil = await import('#lib/password.util.js');
const { hashPassword, verifyPassword } = passwordUtil;
const { AuthService } = await import('./auth.service.js');
const { AuthHelpers } = await import('./helpers/auth.helpers.js');
const { DbLoggerService } = await import('#lib/DbLoggerService.js');
const { PrismaService } = await import('#prisma/prisma.service.js');
const { JwtService } = await import('@nestjs/jwt');
const { Test } = await import('@nestjs/testing');
const { RequestContextService } = await import('#context/request-context.service.js');

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
            refreshToken: { findMany: jest.fn(), delete: jest.fn(), create: jest.fn() },
            blacklistedToken: { findUnique: jest.fn(), create: jest.fn() },
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
    it('✅ creates new user and returns tokens', async () => {
      (prisma.user.create as jest.Mock).mockResolvedValueOnce({ id: 'user-1' } as never);

      const result = await service.registerUser({
        firstName: 'John',
        surname: 'Smith',
        password: 'P@ssw0rd123',
      });

      expect(helpers.getOrCreateFirstName).toHaveBeenCalledWith('John');
      expect(helpers.getOrCreateSurname).toHaveBeenCalledWith('Smith');
      expect(helpers.generateUniqueLogin).toHaveBeenCalledWith('John', 'Smith');
      expect(hashPassword).toHaveBeenCalledWith('P@ssw0rd123');
      expect(prisma.user.create).toHaveBeenCalled();

      expect(result).toEqual({
        user: { id: 'user-1' },
        login: 'jsmith',
        access_token: 'signed-jwt-token',
        refresh_token: 'signed-jwt-token',
      });
    });
  });

  describe('loginUser', () => {
    it('✅ logs successful login', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'user-1',
        login: 'jdoe',
        email: 'jdoe@vitala.com',
        passwordHash: 'hashed-pass',
        failedLoginAttempts: 0,
        isActive: true,
        isLocked: false,
        lockedUntil: null,
        mustChangePassword: false,
      } as never);

      const result = await service.loginUser('jdoe', 'correct-pass');

      expect(dbLogger.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'login',
          entityType: 'User',
          entityId: 'user-1',
        }),
      );

      expect(result).toEqual({ access_token: 'signed-jwt-token' });
    });

    it('❌ throws when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null as never);

      await expect(service.loginUser('jdoe', 'wrong-pass')).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid login or password',
      });
    });
  });

  describe('logoutUser', () => {
    it('✅ logs out user', async () => {
      (prisma.refreshToken.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'token-1',
          tokenHash: 'hashed-token',
          expiresAt: new Date(Date.now() + 1000 * 60),
          user: { id: 'user-1', login: 'jdoe' },
        },
      ] as never);

      (verifyPassword as jest.Mock).mockResolvedValue(true as never);
      (prisma.blacklistedToken.create as jest.Mock).mockResolvedValue({} as never);
      (prisma.refreshToken.delete as jest.Mock).mockResolvedValue({} as never);

      const result = await service.logoutUser('mock-refresh-token');

      expect(prisma.blacklistedToken.create).toHaveBeenCalled();
      expect(prisma.refreshToken.delete).toHaveBeenCalled();

      expect(result).toEqual({ message: 'Successfully logged out' });
    });

    it('❌ throws if token not found', async () => {
      (prisma.refreshToken.findMany as jest.Mock).mockResolvedValue([] as never);

      await expect(service.logoutUser('invalid-token')).rejects.toMatchObject({
        statusCode: 401,
        message: 'Token already invalidated or expired',
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
