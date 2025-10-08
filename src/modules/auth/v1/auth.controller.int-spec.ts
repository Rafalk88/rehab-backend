import { verifyPassword } from '#lib/password.util.js';
import { AuthModule } from '#modules/auth/v1/auth.module.js';
import { PrismaService } from '#prisma/prisma.service.js';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

jest.mock('@lib/password.util', () => ({
  hashPassword: jest.fn().mockResolvedValue('new-hash'),
  verifyPassword: jest.fn(),
}));

const prismaMock = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  givenName: { findFirst: jest.fn(), create: jest.fn() },
  surname: { findFirst: jest.fn(), create: jest.fn() },
  refreshToken: { findMany: jest.fn(), create: jest.fn(), delete: jest.fn() },
  blacklistedToken: { findUnique: jest.fn(), create: jest.fn() },
  passwordHistory: { findMany: jest.fn(), create: jest.fn(), delete: jest.fn() },
};

describe('AuthController (integration)', () => {
  let app: INestApplication;

  // fake admin middleware
  const fakeAdminMiddleware = (req, _res, next) => {
    req.user = { sub: 'admin-1' };
    next();
  };

  const fakeUserMiddleware = (req, _res, next) => {
    req.user = { sub: 'user-1' };
    next();
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    beforeEach(() => {
      app.use(fakeAdminMiddleware); // now register requires admin
    });

    it('should register a new user and return login', async () => {
      prismaMock.givenName.findFirst.mockResolvedValueOnce(null);
      prismaMock.givenName.create.mockResolvedValueOnce({ id: 'fname-1', firstName: 'john' });
      prismaMock.surname.findFirst.mockResolvedValueOnce(null);
      prismaMock.surname.create.mockResolvedValueOnce({ id: 'sname-1', surname: 'doe' });
      prismaMock.user.create.mockResolvedValueOnce({
        id: 'user-1',
        login: 'jdoe',
        email: 'jdoe@vitala.com',
      });

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ firstName: 'John', surname: 'Doe', password: 'Secret123' })
        .expect(201);

      expect(res.body).toEqual(
        expect.objectContaining({
          login: 'jdoe',
          user: expect.objectContaining({
            id: 'user-1',
            email: 'jdoe@vitala.com',
          }),
        }),
      );
    });
  });

  describe('/auth/login (POST)', () => {
    it('should login and return access token', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        login: 'jdoe',
        email: 'jdoe@vitala.com',
        passwordHash: 'hashed-pass',
        failedLoginAttempts: 0,
        isActive: true,
        isLocked: false,
        mustChangePassword: false,
        lockedUntil: null,
      });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ login: 'jdoe', password: 'Secret123' })
        .expect(201);

      expect(res.body).toHaveProperty('access_token');
    });
  });

  describe('/auth/logout (POST)', () => {
    beforeEach(() => {
      app.use(fakeUserMiddleware);
    });

    it('should logout a user successfully', async () => {
      prismaMock.refreshToken.findMany.mockResolvedValueOnce([
        {
          id: 'token-1',
          user: { id: 'user-1' },
          tokenHash: 'hashed-refresh',
          expiresAt: new Date(Date.now() + 1000),
        },
      ]);
      prismaMock.refreshToken.delete.mockResolvedValueOnce({});
      prismaMock.blacklistedToken.create.mockResolvedValueOnce({});

      const res = await request(app.getHttpServer()).post('/auth/logout').expect(201);

      expect(res.body).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('/auth/refresh-token (POST)', () => {
    it('should refresh tokens successfully', async () => {
      const fakeRefreshToken = 'refresh-token-123';

      prismaMock.refreshToken.findMany.mockResolvedValueOnce([
        {
          id: 'token-1',
          user: { id: 'user-1', email: 'jdoe@vitala.com' },
          tokenHash: fakeRefreshToken,
          expiresAt: new Date(Date.now() + 1000),
        },
      ]);
      prismaMock.refreshToken.create.mockResolvedValueOnce({});
      prismaMock.refreshToken.delete.mockResolvedValueOnce({});
      prismaMock.blacklistedToken.create.mockResolvedValueOnce({});

      const res = await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .send({ refreshToken: fakeRefreshToken })
        .expect(201);

      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('refresh_token');
    });
  });

  describe('/auth/change-password (POST)', () => {
    beforeEach(() => {
      app.use(fakeUserMiddleware);
    });

    it('should change password successfully', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'user-1', passwordHash: 'old-hash' });
      prismaMock.passwordHistory.findMany.mockResolvedValueOnce([]);
      (verifyPassword as jest.Mock).mockResolvedValueOnce(true);
      prismaMock.user.update.mockResolvedValueOnce({});
      prismaMock.passwordHistory.create.mockResolvedValueOnce({});
      prismaMock.passwordHistory.delete.mockResolvedValueOnce({});

      const res = await request(app.getHttpServer())
        .post('/auth/change-password')
        .send({
          oldPassword: 'OldPass123!',
          newPassword: 'NewPass456!',
          confirmNewPassword: 'NewPass456!',
        })
        .expect(201);

      expect(res.body).toEqual({ message: 'Password changed successfully' });
    });
  });

  describe('/auth/reset-password (POST)', () => {
    beforeEach(() => {
      app.use(fakeAdminMiddleware);
    });

    it('should reset user password and return temp password', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'user-1', login: 'jdoe' });
      prismaMock.user.update.mockResolvedValueOnce({});

      const res = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ userId: 'user-1' })
        .expect(201);

      expect(res.body).toHaveProperty('tempPassword');
      expect(res.body.tempPassword).toHaveLength(12);
    });
  });

  describe('/auth/lock-user/:userId (POST)', () => {
    beforeEach(() => {
      app.use(fakeAdminMiddleware);
    });

    it('should lock a user temporarily', async () => {
      const fakeUser = { id: 'user-2', isLocked: false, lockedUntil: null };
      prismaMock.user.findUnique.mockResolvedValueOnce(fakeUser);
      prismaMock.user.update.mockResolvedValueOnce({
        id: 'user-2',
        isLocked: true,
        lockedUntil: new Date(Date.now() + 60 * 60 * 1000),
      });

      const res = await request(app.getHttpServer())
        .post('/auth/lock-user/user-2')
        .send({ durationInMinutes: 60, reason: 'Violation of rules' })
        .expect(201);

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-2' },
          data: expect.objectContaining({ isLocked: true }),
        }),
      );

      expect(res.body).toEqual(
        expect.objectContaining({
          message: 'User blocked successfully',
          reason: 'Violation of rules',
        }),
      );
    });

    it('should lock a user permanently if no duration is provided', async () => {
      const fakeUser = { id: 'user-3', isLocked: false, lockedUntil: null };
      prismaMock.user.findUnique.mockResolvedValueOnce(fakeUser);
      prismaMock.user.update.mockResolvedValueOnce({
        id: 'user-3',
        isLocked: true,
        lockedUntil: new Date('9999-12-31T23:59:59Z'),
      });

      const res = await request(app.getHttpServer())
        .post('/auth/lock-user/user-3')
        .send({ reason: 'Severe violation' })
        .expect(201);

      expect(res.body).toEqual(
        expect.objectContaining({
          message: 'User blocked successfully',
          reason: 'Severe violation',
        }),
      );
    });

    it('should return 404 if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null);

      const res = await request(app.getHttpServer())
        .post('/auth/lock-user/nonexistent-user')
        .send({ durationInMinutes: 30 })
        .expect(404);

      expect(res.body.message).toEqual('User not found');
    });
  });
});
