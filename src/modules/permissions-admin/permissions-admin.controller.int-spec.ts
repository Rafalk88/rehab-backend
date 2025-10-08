import { PermissionsAdminController } from './permissions-admin.controller.js';
import { PermissionsAdminService } from './permissions-admin.service.js';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

const serviceMock = {
  assignRoleToUser: jest.fn(),
  assignPermissionToRole: jest.fn(),
  overridePermissionForUser: jest.fn(),
};

const fakeAdminMiddleware = (req, _res, next) => {
  req.user = { sub: 'admin-1' };
  next();
};

describe('PermissionsAdminController (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PermissionsAdminController],
      providers: [{ provide: PermissionsAdminService, useValue: serviceMock }],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(fakeAdminMiddleware);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/permissions-admin/users/:userId/roles/:roleId (POST)', () => {
    it('should assign role to user', async () => {
      serviceMock.assignRoleToUser.mockResolvedValueOnce({
        success: true,
        userId: 'user-1',
        roleId: 'role-1',
        assignedBy: 'admin-1',
      });

      const res = await request(app.getHttpServer())
        .post('/permissions-admin/users/user-1/roles/role-1')
        .expect(201);

      expect(serviceMock.assignRoleToUser).toHaveBeenCalledWith(
        'user-1',
        'role-1',
        'admin-1',
        expect.any(String), // ip
      );
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          userId: 'user-1',
          roleId: 'role-1',
        }),
      );
    });
  });

  describe('/permissions-admin/roles/:roleId/permissions (POST)', () => {
    it('should assign permission to role', async () => {
      serviceMock.assignPermissionToRole.mockResolvedValueOnce({
        success: true,
        roleId: 'role-1',
        permission: 'can_edit',
      });

      const res = await request(app.getHttpServer())
        .post('/permissions-admin/roles/role-1/permissions')
        .send({ permission: 'can_edit' })
        .expect(201);

      expect(serviceMock.assignPermissionToRole).toHaveBeenCalledWith(
        'role-1',
        { permission: 'can_edit' },
        'admin-1',
        expect.any(String),
      );
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          permission: 'can_edit',
        }),
      );
    });
  });

  describe('/permissions-admin/users/:userId/overrides (POST)', () => {
    it('should override permission for user', async () => {
      serviceMock.overridePermissionForUser.mockResolvedValueOnce({
        success: true,
        userId: 'user-1',
        override: { permission: 'can_delete', allow: false },
      });

      const res = await request(app.getHttpServer())
        .post('/permissions-admin/users/user-1/overrides')
        .send({ permission: 'can_delete', allow: false })
        .expect(201);

      expect(serviceMock.overridePermissionForUser).toHaveBeenCalledWith(
        'user-1',
        { permission: 'can_delete', allow: false },
        'admin-1',
        expect.any(String),
      );
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          override: { permission: 'can_delete', allow: false },
        }),
      );
    });
  });
});
