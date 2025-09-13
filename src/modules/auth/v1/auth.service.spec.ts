import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AuthService } from './auth.service.js';
import { PrismaService } from '@/prisma/prisma.service.js';
import { AuthHelpers } from './helpers/auth.helpers.js';
import { DbLoggerService, LogParams } from '@lib/DbLoggerService.js';
import { hashPassword } from '@lib/password.util.js';

jest.mock('@lib/password.util', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
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
            user: {
              create: jest.fn(),
              findUnique: jest.fn(),
            },
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
    it('should create a new user and log the action', async () => {
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

      expect(result).toEqual({ user: { id: 'user-1' }, login: 'jsmith' });
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

      await service.loginUser('jdoe', 'correct-pass');

      expect(dbLogger.logAction).toHaveBeenCalledWith(
        expect.objectContaining<Partial<LogParams>>({
          userId: 'user-1',
          action: 'login',
          entityType: 'User',
          entityId: 'user-1',
        }),
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.loginUser('jdoe', 'wrong-pass')).rejects.toThrow(UnauthorizedException);

      expect(dbLogger.logAction).not.toHaveBeenCalled();
    });
  });

  describe('logoutUser', () => {
    it('should log out user and record action', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'user-1',
        login: 'jdoe',
      });

      await service.logoutUser('user-1');

      expect(dbLogger.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'logout',
          entityType: 'User',
          entityId: 'user-1',
        }),
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.logoutUser('unknown')).rejects.toThrow(UnauthorizedException);
    });
  });
});
