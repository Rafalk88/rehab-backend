import type { Prisma } from '#generated/prisma/client.js';
import { createPrismaMock, MockPrisma } from '#tests/helpers/prisma-mock.js';
import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { type RequestContextService } from '#context/request-context.service.js';
import { type VisitsService } from './visits.service.js';

type VisitWithPatient = Prisma.VisitGetPayload<{
  include: { patient: { include: { firstName: true; surname: true; peselEncrypted: true } } };
}>;

describe('VisitsService', () => {
  let service: VisitsService;
  let prisma: MockPrisma;
  let requestContext: RequestContextService;

  let aesGcmEncrypt: jest.Mock;

  beforeEach(async () => {
    prisma = createPrismaMock();

    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('#lib/encryption.util.js', () => ({
        aesGcmDecrypt: jest.fn((s) => `${s}2010112345`),
      }));

      const { VisitsService } = await import('./visits.service.js');
      const { RequestContextService } = await import('#context/request-context.service.js');
      const { PrismaService } = await import('#prisma/prisma.service.js');
      const encryption = await import('#lib/encryption.util.js');

      aesGcmEncrypt = encryption.aesGcmEncrypt as jest.Mock;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          VisitsService,
          {
            provide: PrismaService,
            useValue: prisma,
          },
          {
            provide: RequestContextService,
            useValue: {
              get: jest.fn().mockReturnValue({ userId: 'user-1', ipAddress: '127.0.0.1' }),
              withAudit: jest
                .fn()
                .mockImplementation(async (_, fn) => (fn as () => Promise<any>)()),
            },
          },
        ],
      }).compile();

      service = module.get(VisitsService);
      prisma = module.get(PrismaService);
      requestContext = module.get(RequestContextService);
    });
  });

  it('should return paginated visits', async () => {
    const mockVisits = [
      {
        id: 'visit-1',
        patientId: 'patient-1',
        status: 'PLANNED',
        organizationalUnitId: 'orgUnit-1',
        plannedDate: new Date('2026-07-01'),
        patient: {
          firstName: { firstName: 'John' },
          surname: { surname: 'Doe' },
          peselEncrypted: '9',
        },
      },
      {
        id: 'visit-2',
        patientId: 'patient-2',
        status: 'PLANNED',
        organizationalUnitId: 'orgUnit-1',
        plannedDate: new Date('2026-07-01'),
        patient: {
          firstName: { firstName: 'Jane' },
          surname: { surname: 'Smith' },
          peselEncrypted: '8',
        },
      },
    ] as VisitWithPatient[];

    prisma.visit.findMany.mockResolvedValueOnce(mockVisits);
    prisma.visit.count.mockResolvedValueOnce(2);

    const result = await service.findAll({
      orgId: 'orgUnit-1',
      dateFrom: '2026-07-01',
      dateTo: '2026-07-01',
      status: 'PLANNED',
      page: 1,
      limit: 10,
    });

    expect(result).toEqual(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            patient: expect.objectContaining({
              firstName: { firstName: 'John' },
              surname: { surname: 'Doe' },
              pesel: '92010112345',
            }),
          }),
          expect.objectContaining({
            patient: expect.objectContaining({
              firstName: { firstName: 'Jane' },
              surname: { surname: 'Smith' },
              pesel: '82010112345',
            }),
          }),
        ]),
        meta: expect.objectContaining({
          total: 2,
          page: 1,
        }),
      }),
    );
  });
});
