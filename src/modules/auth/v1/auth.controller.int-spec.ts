import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthModule } from '@modules/auth/v1/auth.module.js';
import { PrismaService } from '@/prisma/prisma.service.js';

const prismaMock = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  givenName: { findFirst: jest.fn(), create: jest.fn() },
  surname: { findFirst: jest.fn(), create: jest.fn() },
  refreshToken: {
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  blacklistedToken: { findUnique: jest.fn(), create: jest.fn() },
};

describe('AuthController (integration)', () => {
  let app: INestApplication;

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
        .set('x-forwarded-for', '127.0.0.1')
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
        .set('x-forwarded-for', '127.0.0.1')
        .send({ login: 'jdoe', password: 'Secret123' })
        .expect(201);

      expect(res.body).toHaveProperty('access_token');
    });
  });

  describe('/auth/logout (POST)', () => {
    it('should logout a user successfully', async () => {
      const fakeUserMiddleware = (req, _res, next) => {
        req.user = { sub: 'user-1' };
        next();
      };
      app.use(fakeUserMiddleware);

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

    it('should return message if no user logged in', async () => {
      const res = await request(app.getHttpServer()).post('/auth/logout').expect(201);

      expect(res.body).toEqual({ message: 'No user logged in' });
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

    it('should return unauthorized if token is invalid', async () => {
      prismaMock.refreshToken.findMany.mockResolvedValueOnce([]);

      const res = await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/unauthorized/i);
    });
  });
});
