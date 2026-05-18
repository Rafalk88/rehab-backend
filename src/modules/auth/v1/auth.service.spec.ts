import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { AppError } from '#common/errors/app.error.js';
import { createPrismaMock, type MockPrisma } from '#tests/helpers/prisma-mock.js';

await jest.unstable_mockModule('@nestjs/jwt', () => ({
  JwtService: class {
    sign = jest.fn().mockReturnValue('signed-jwt-token');
  },
}));

describe('AuthService', () => {
  let service: any;
  let prisma: MockPrisma;
  let helpers: any;
  let jwtService: any;
  let requestContext: any;

  let computeHmac: jest.Mock;
  let aesGcmEncrypt: jest.Mock;
  let maskString: jest.Mock;
  let verifyPassword: jest.Mock;

  beforeEach(async () => {
    prisma = createPrismaMock();

    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('#lib/encryption.util.js', () => ({
        computeHmac: jest.fn((s) => `hmac-${s}`),
        aesGcmEncrypt: jest.fn((s) => `enc-${s}`),
        maskString: jest.fn((s) => `mask-${s}`),
      }));

      await jest.unstable_mockModule('#lib/password.util.js', () => ({
        hashPassword: jest.fn().mockResolvedValue('hashed-password' as never),
        verifyPassword: jest.fn(),
      }));

      await jest.unstable_mockModule('#lib/DbLoggerService.js', () => ({
        DbLoggerService: class {
          logAction = jest.fn();
        },
      }));

      const { AuthService } = await import('./auth.service.js');
      const { JwtService } = await import('@nestjs/jwt');
      const { PrismaService } = await import('#prisma/prisma.service.js');
      const { AuthHelpers } = await import('./helpers/auth.helpers.js');
      const { DbLoggerService } = await import('#lib/DbLoggerService.js');
      const { RequestContextService } = await import('#context/request-context.service.js');
      const encryption = await import('#lib/encryption.util.js');
      const password = await import('#lib/password.util.js');

      computeHmac = encryption.computeHmac as jest.Mock;
      aesGcmEncrypt = encryption.aesGcmEncrypt as jest.Mock;
      maskString = encryption.maskString as jest.Mock;
      verifyPassword = password.verifyPassword as jest.Mock;

      const module = await Test.createTestingModule({
        providers: [
          AuthService,
          {
            provide: JwtService,
            useValue: {
              sign: jest.fn().mockReturnValue('signed-jwt-token'),
            },
          },
          { provide: PrismaService, useValue: prisma },
          {
            provide: AuthHelpers,
            useValue: {
              getOrCreateFirstName: jest.fn().mockResolvedValue({ id: 'fname-1' } as never),
              getOrCreateSurname: jest.fn().mockResolvedValue({ id: 'sname-1' } as never),
              generateUniqueLogin: jest.fn().mockResolvedValue('jsmith' as never),
              verifyLoginCredentials: jest.fn(),
              checkLoginRestrictions: jest.fn(),
              updateLoginSuccess: jest.fn(),
            },
          },
          {
            provide: RequestContextService,
            useValue: {
              get: jest.fn().mockReturnValue({
                userId: 'user-1',
                ipAddress: '127.0.0.1',
              }),
              withAudit: jest
                .fn()
                .mockImplementation(async (_, fn) => (fn as () => Promise<any>)()),
            },
          },
          {
            provide: DbLoggerService,
            useValue: { logAction: jest.fn() },
          },
        ],
      }).compile();

      service = module.get(AuthService);
      helpers = module.get(AuthHelpers);
      jwtService = module.get(JwtService);
      requestContext = module.get(RequestContextService);
    });
  });

  describe('registerUser', () => {
    it('creates new user with encrypted fields', async () => {
      prisma.user.create.mockResolvedValueOnce({ id: 'user-1' } as any);

      const result = await service.registerUser({
        firstName: 'John',
        surname: 'Smith',
        password: 'P@ssw0rd123',
      });

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

  describe('logoutUser', () => {
    it('logs out user', async () => {
      prisma.refreshToken.findMany.mockResolvedValue([{ id: 't1', expiresAt: new Date() }] as any);

      prisma.blacklistedToken.createMany.mockResolvedValue({} as any);
      prisma.refreshToken.deleteMany.mockResolvedValue({} as any);

      const result = await service.logoutUser();

      expect(result).toEqual({ message: 'Successfully logged out' });
    });
  });

  describe('changePassword', () => {
    it('changes password successfully', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash: 'old-hash',
        loginMasked: 'mask-user',
      } as any);

      prisma.passwordHistory.findMany.mockResolvedValue([]);
      verifyPassword.mockResolvedValue(true as never);
      prisma.user.update.mockResolvedValue({} as any);
      prisma.passwordHistory.create.mockResolvedValue({} as any);

      const result = await service.changePassword(
        'user-1',
        'OldPass123!',
        'NewPass456!',
        'NewPass456!',
      );

      expect(result).toEqual({ message: 'Password changed successfully' });
    });

    it('throws if old password incorrect', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash: 'old-hash',
      } as any);

      verifyPassword.mockResolvedValue(false as never);

      await expect(
        service.changePassword('user-1', 'wrong', 'New1!', 'New1!'),
      ).rejects.toMatchObject({
        name: 'AppError',
        message: expect.any(String),
        statusCode: expect.any(Number),
      });
    });
  });
});
