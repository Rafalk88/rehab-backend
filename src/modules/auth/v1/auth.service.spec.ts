import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { AuthHelpers } from './helpers/auth.helpers.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { DbLoggerService, LogParams } from '@lib/DbLoggerService.js';
import { hashPassword, verifyPassword } from '@lib/password.util.js';

jest.mock('@lib/password.util.ts', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
  verifyPassword: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let helpers: jest.Mocked<AuthHelpers>;
  let jwtService: jest.Mocked<JwtService>;
  let dbLogger: jest.Mocked<DbLoggerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
            getOrCreateFirstName: jest.fn().mockResolvedValue({ id: 'fname-1' }),
            getOrCreateSurname: jest.fn().mockResolvedValue({ id: 'sname-1' }),
            generateUniqueLogin: jest.fn().mockResolvedValue('jsmith'),
            verifyLoginCredentials: jest.fn(),
            checkLoginRestrictions: jest.fn(),
            updateLoginSuccess: jest.fn(),
            generateTemporaryPassword: jest.fn().mockReturnValue('TempPass123!'), // new helper for admin reset
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('signed-jwt-token') },
        },
        {
          provide: DbLoggerService,
          useValue: { logAction: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    helpers = module.get(AuthHelpers);
    jwtService = module.get(JwtService);
    dbLogger = module.get(DbLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should create a new user and return tokens', async () => {
      (prisma.user.create as jest.Mock).mockResolvedValueOnce({ id: 'user-1' } as any);

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
      expect(dbLogger.logAction).toHaveBeenCalledWith(
        expect.objectContaining<Partial<LogParams>>({
          userId: 'user-1',
          action: 'register',
          entityType: 'User',
          entityId: 'user-1',
        }),
      );

      expect(result).toEqual({
        user: { id: 'user-1' },
        login: 'jsmith',
        access_token: 'signed-jwt-token',
        refresh_token: 'signed-jwt-token',
      });
    });
  });

  describe('loginUser', () => {
    it('should log successful login', async () => {
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
      } as any);

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

    it('should throw AppError if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.loginUser('jdoe', 'wrong-pass')).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid login or password',
      });
    });
  });

  describe('logoutUser', () => {
    it('should log out user and record action', async () => {
      (prisma.refreshToken.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'token-1',
          tokenHash: 'hashed-token',
          expiresAt: new Date(Date.now() + 1000 * 60),
          user: { id: 'user-1', login: 'jdoe' },
        },
      ]);

      (verifyPassword as jest.Mock).mockResolvedValue(true);
      (prisma.blacklistedToken.create as jest.Mock).mockResolvedValue({});
      (prisma.refreshToken.delete as jest.Mock).mockResolvedValue({});

      const result = await service.logoutUser('mock-refresh-token');

      expect(prisma.blacklistedToken.create).toHaveBeenCalled();
      expect(prisma.refreshToken.delete).toHaveBeenCalled();
      expect(dbLogger.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'logout',
        }),
      );
      expect(result).toEqual({ message: 'Successfully logged out' });
    });

    it('should throw AppError if token not found', async () => {
      (prisma.refreshToken.findMany as jest.Mock).mockResolvedValue([]);

      await expect(service.logoutUser('invalid-token')).rejects.toMatchObject({
        statusCode: 401,
        message: 'Token already invalidated or expired',
      });
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      (prisma.refreshToken.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'token-1',
          tokenHash: 'hashed-token',
          expiresAt: new Date(Date.now() + 1000 * 60),
          user: { id: 'user-1', email: 'jdoe@vitala.com' },
        },
      ]);

      (verifyPassword as jest.Mock).mockResolvedValue(true);
      (prisma.blacklistedToken.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.blacklistedToken.create as jest.Mock).mockResolvedValue({});
      (prisma.refreshToken.delete as jest.Mock).mockResolvedValue({});
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      const result = await service.refreshTokens('mock-refresh-token');

      expect(prisma.blacklistedToken.create).toHaveBeenCalled();
      expect(prisma.refreshToken.delete).toHaveBeenCalled();
      expect(prisma.refreshToken.create).toHaveBeenCalled();

      expect(result).toEqual({
        access_token: 'signed-jwt-token',
        refresh_token: 'signed-jwt-token',
      });
    });
  });

  describe('changePassword', () => {
    const userId = 'user-1';
    const ipAddress = '127.0.0.1';

    it('should successfully change password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: userId,
        passwordHash: 'old-hash',
        mustChangePassword: true,
      });

      (prisma.passwordHistory.findMany as jest.Mock).mockResolvedValue([]);
      (verifyPassword as jest.Mock).mockResolvedValue(true);
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      (prisma.passwordHistory.create as jest.Mock).mockResolvedValue({});
      (dbLogger.logAction as jest.Mock).mockResolvedValue(undefined);

      const result = await service.changePassword(
        userId,
        'OldPass123!',
        'NewPass456!',
        'NewPass456!',
        ipAddress,
      );

      expect(result).toEqual({ message: 'Password changed successfully' });
      expect(prisma.user.update).toHaveBeenCalled();
      expect(prisma.passwordHistory.create).toHaveBeenCalled();
      expect(dbLogger.logAction).toHaveBeenCalled();
    });

    it('should throw if old password is incorrect', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: userId,
        passwordHash: 'old-hash',
      });
      (verifyPassword as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword(userId, 'WrongOldPass', 'NewPass456!', 'NewPass456!', ipAddress),
      ).rejects.toMatchObject({ statusCode: 401, message: 'Old password is incorrect' });
    });

    it('should throw if new passwords do not match', async () => {
      await expect(
        service.changePassword(userId, 'OldPass123!', 'NewPass1', 'NewPass2', ipAddress),
      ).rejects.toMatchObject({ statusCode: 400, message: 'New passwords do not match' });
    });
  });

  describe('resetPassword', () => {
    const userId = 'user-1';

    it('should reset password and return temporary password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: userId,
        passwordHash: 'old-hash',
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await service.resetPassword(userId);

      expect(result).toHaveProperty('tempPassword');
      expect(result).toBe('TempPass123!'); // matches mocked helper
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: userId }, data: expect.any(Object) }),
      );
      expect(dbLogger.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ userId: userId, action: 'admin_reset_password' }),
      );
    });

    it('should throw if user does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.resetPassword(userId)).rejects.toMatchObject({
        statusCode: 404,
        message: 'User not found',
      });
    });
  });

  describe('lockUser', () => {
    const adminId = 'admin-1';
    const adminIp = '127.0.0.1';
    const userId = 'user-1';

    it('should lock user temporarily', async () => {
      const user = { id: userId, isLocked: false, lockedUntil: null, login: 'jsmith' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prisma.user.update as jest.Mock).mockImplementation(({ data }) => ({
        ...user,
        ...data,
      }));

      const result = await service.lockUser(userId, adminId, adminIp, 60, 'Test reason');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({ isLocked: true }),
      });

      expect(dbLogger.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: adminId,
          action: 'LOCK_USER',
          actionDetails: expect.stringContaining('Test reason'),
          oldValues: { isLocked: false, lockedUntil: null },
          newValues: expect.objectContaining({ isLocked: true }),
          entityType: 'User',
          entityId: userId,
          ipAddress: adminIp,
        }),
      );

      expect(result).toHaveProperty('lockedUntil');
      expect(result.reason).toBe('Test reason');
    });

    it('should lock user permanently if no duration provided', async () => {
      const user = { id: userId, isLocked: false, lockedUntil: null, login: 'jsmith' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prisma.user.update as jest.Mock).mockImplementation(({ data }) => ({
        ...user,
        ...data,
      }));

      const result = await service.lockUser(userId, adminId, adminIp);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({ isLocked: true }),
      });

      expect(result.lockedUntil?.getFullYear()).toBe(9999);
      expect(result.reason).toBe('Not specified');
    });

    it('should throw if user does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.lockUser(userId, adminId, adminIp, 60, 'Reason')).rejects.toMatchObject({
        statusCode: 404,
        message: 'User not found',
      });
    });
  });
});
