import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsCache } from './permissions.cache.js';
import { PermissionsService } from './permissions.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let prisma: jest.Mocked<PrismaService>;
  let cache: jest.Mocked<PermissionsCache>;

  const userId = 'user-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: jest.fn() },
            userPermission: { findMany: jest.fn() },
          },
        },
        {
          provide: PermissionsCache,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
    prisma = module.get(PrismaService);
    cache = module.get(PermissionsCache);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPermissions', () => {
    it('should return cached permissions if present', async () => {
      cache.get.mockReturnValue(['PERM_READ']);
      const result = await service.getPermissions(userId);
      expect(result?.perms).toEqual(['PERM_READ']);
    });

    it('should load permissions from DB if cache empty', async () => {
      cache.get.mockReturnValue(null);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        userRoles: [
          {
            role: { rolePermissions: [{ permission: 'PERM_READ' }, { permission: 'PERM_WRITE' }] },
          },
        ],
        userPermissions: [{ permission: 'PERM_DELETE', allowed: true }],
        organizationalUnitId: 'org-1',
      } as any);

      const result = await service.getPermissions(userId);

      expect(result?.perms).toEqual(['PERM_READ', 'PERM_WRITE']);
      expect(result?.overrides).toEqual([{ permission: 'PERM_DELETE', allowed: true }]);
      expect(result?.orgId).toBe('org-1');
      expect(cache.set).toHaveBeenCalledWith(userId, ['PERM_READ', 'PERM_WRITE']);
    });

    it('should return null if user not found', async () => {
      cache.get.mockReturnValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getPermissions(userId);
      expect(result).toBeNull();
    });
  });

  describe('canAccess', () => {
    it('should allow access if user has required permission', async () => {
      jest.spyOn(service, 'getPermissions').mockResolvedValue({
        perms: ['PERM_READ'],
        overrides: [],
        orgId: null,
      });

      const result = await service.canAccess(userId, 'PERM_READ');
      expect(result).toBe(true);
    });

    it('should deny access if user lacks required permission', async () => {
      jest.spyOn(service, 'getPermissions').mockResolvedValue({
        perms: ['PERM_READ'],
        overrides: [],
        orgId: null,
      });

      const result = await service.canAccess(userId, 'PERM_WRITE');
      expect(result).toBe(false);
    });

    it('should respect overrides', async () => {
      jest.spyOn(service, 'getPermissions').mockResolvedValue({
        perms: ['PERM_READ'],
        overrides: [{ permission: 'PERM_READ', allowed: false }],
        orgId: null,
      });

      const result = await service.canAccess(userId, 'PERM_READ');
      expect(result).toBe(false);
    });

    it('should enforce organizational unit check', async () => {
      jest.spyOn(service, 'getPermissions').mockResolvedValue({
        perms: ['PERM_READ'],
        overrides: [],
        orgId: 'org-1',
      });

      const result = await service.canAccess(userId, 'PERM_READ', 'org-2');
      expect(result).toBe(false);

      const result2 = await service.canAccess(userId, 'PERM_READ', 'org-1');
      expect(result2).toBe(true);
    });
  });
});
