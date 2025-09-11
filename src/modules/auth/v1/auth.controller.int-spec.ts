import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthModule } from '@modules/auth/v1/auth.module.js';
import { PrismaService } from '@/prisma/prisma.service.js';

// 🔹 mock Prisma, żeby nie dotykać prawdziwej bazy
const prismaMock = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  givenName: { findFirst: jest.fn(), create: jest.fn() },
  surname: { findFirst: jest.fn(), create: jest.fn() },
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
});
