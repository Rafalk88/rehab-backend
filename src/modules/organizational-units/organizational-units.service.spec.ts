import { OrganizationalUnitsService } from './organizational-units.service.js';
import type { OrganizationalUnit } from '#generated/prisma/index.js';
import { PrismaService } from '#prisma/prisma.service.js';
import { createPrismaMock, type MockPrisma } from '#tests/helpers/prisma-mock.js';
import { Test, TestingModule } from '@nestjs/testing';

const OU_DATA = [
  { id: 'ou1', name: 'Organizational Unit 1', description: 'Description for OU 1' },
  { id: 'ou2', name: 'Organizational Unit 2', description: 'Description for OU 2' },
] as unknown as OrganizationalUnit[];

const EMPTY_DATA = [];

describe('OrganizationalUnitsService', () => {
  let service: OrganizationalUnitsService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [OrganizationalUnitsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<OrganizationalUnitsService>(OrganizationalUnitsService);
  });

  describe('findAll', () => {
    it('get the data from the database', async () => {
      prisma.organizationalUnit.findMany.mockResolvedValueOnce(OU_DATA);

      const result = await service.getOrganizationalUnits();

      expect(result).toEqual(OU_DATA);
    });

    it('get empty table from the database', async () => {
      prisma.organizationalUnit.findMany.mockResolvedValueOnce(EMPTY_DATA);

      const result = await service.getOrganizationalUnits();

      expect(result).toEqual(EMPTY_DATA);
    });
  });
});
