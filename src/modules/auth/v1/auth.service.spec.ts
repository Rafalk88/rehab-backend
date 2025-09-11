import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AuthService } from './auth.service.js';
import { PrismaService } from '@/prisma/prisma.service.js';
import { AuthHelpers } from './helpers/auth.helpers.js';
import { hashPassword } from '@lib/password.util.js';

jest.mock('@lib/password.util', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let helpers: jest.Mocked<AuthHelpers>;
  let jwtService: jest.Mocked<JwtService>;

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
          useValue: {
            sign: jest.fn().mockReturnValue('signed-jwt-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    helpers = module.get(AuthHelpers);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should create a new user with hashed password and generated login', async () => {
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
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            login: 'jsmith',
            email: 'jsmith@vitala.com',
            passwordHash: 'hashed-password',
          }),
        }),
      );

      expect(result).toEqual({ user: { id: 'user-1' }, login: 'jsmith' });
    });
  });

  describe('loginUser', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.loginUser('jdoe', 'wrong-pass')).rejects.toThrow(UnauthorizedException);
    });

    it('should authenticate valid user and return access token', async () => {
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

      await expect(service.loginUser('jdoe', 'correct-pass')).resolves.toEqual({
        access_token: 'signed-jwt-token',
      });

      expect(helpers.verifyLoginCredentials).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-1',
          passwordHash: 'hashed-pass',
          failedLoginAttempts: 0,
        }),
        'correct-pass',
      );

      expect(helpers.checkLoginRestrictions).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
          isLocked: false,
          lockedUntil: null,
          mustChangePassword: false,
        }),
      );

      expect(helpers.updateLoginSuccess).toHaveBeenCalledWith('user-1');
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'jdoe@vitala.com',
      });
    });

    it('should propagate errors from helpers.verifyLoginCredentials', async () => {
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

      helpers.verifyLoginCredentials.mockRejectedValueOnce(
        new UnauthorizedException('Invalid login or password'),
      );

      await expect(service.loginUser('jdoe', 'wrong-pass')).rejects.toThrow(UnauthorizedException);
    });
  });
});
