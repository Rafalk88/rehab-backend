import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { PrismaService } from '@/prisma/prisma.service.js';
import { AuthHelpers } from './helpers/auth.helpers.js';
import { DbLoggerService, LogParams } from '@lib/DbLoggerService.js';
import { hashPassword, verifyPassword } from '@lib/password.util.js';

jest.mock('@lib/password.util', () => ({
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
            user: { create: jest.fn(), findUnique: jest.fn() },
            refreshToken: { findMany: jest.fn(), delete: jest.fn(), create: jest.fn() },
            blacklistedToken: { findUnique: jest.fn(), create: jest.fn() },
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

    it('should throw AppError if token is blacklisted', async () => {
      (prisma.refreshToken.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'token-1',
          tokenHash: 'hashed-token',
          expiresAt: new Date(Date.now() + 1000 * 60),
          user: { id: 'user-1', email: 'jdoe@vitala.com' },
        },
      ]);

      (verifyPassword as jest.Mock).mockResolvedValue(true);
      (prisma.blacklistedToken.findUnique as jest.Mock).mockResolvedValue({ id: 'token-1' });

      await expect(service.refreshTokens('mock-refresh-token')).rejects.toMatchObject({
        statusCode: 401,
        message: 'Refresh token has been revoked',
      });
    });

    it('should throw AppError if token not found', async () => {
      (prisma.refreshToken.findMany as jest.Mock).mockResolvedValue([]);
      await expect(service.refreshTokens('mock-refresh-token')).rejects.toMatchObject({
        statusCode: 401,
        message: 'Refresh token expired or invalid',
      });
    });
  });
});
