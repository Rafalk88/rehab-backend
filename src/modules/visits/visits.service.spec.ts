import type { CreateVisitDto } from './visits.schema.js';
import { VisitsService } from './visits.service.js';
import { RequestContextService } from '#context/request-context.service.js';
import { PrismaService } from '#prisma/prisma.service.js';
import { createPrismaMock, type MockPrisma } from '#tests/helpers/prisma-mock.js';
import type { Prisma } from '#generated/prisma/client.js';
import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

type PatientType = Prisma.PatientGetPayload<{
  include: { firstName: true; surname: true };
}>;

type OrganizationalUnitType = Prisma.OrganizationalUnitGetPayload<{}>;

type VisitWithPatient = Prisma.VisitGetPayload<{
  include: { patient: { include: { firstName: true; surname: true } } };
}>;

describe('VisitsService', () => {
  let service: VisitsService;
  let prisma: MockPrisma;
  let requestContext;

  beforeEach(async () => {
    prisma = createPrismaMock();

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
            withAudit: jest.fn().mockImplementation(async (_, fn) => (fn as () => Promise<any>)()),
          },
        },
      ],
    }).compile();

    service = module.get<VisitsService>(VisitsService);
    requestContext = module.get(RequestContextService);
  });

  describe('create', () => {
    const PATIENT_OBJECT = {
      id: 'patient-1',
      firstName: { firstName: 'Jan' },
      surname: { surname: 'Kowalski' },
    };

    const SERVICE_DATA: CreateVisitDto = {
      patientId: 'patient-1',
      organizationalUnitId: 'orgUnit-1',
      plannedDate: '2026-06-26',
      status: 'PLANNED',
    };

    it('should create a visit successfully', async () => {
      prisma.patient.findUnique.mockResolvedValueOnce(PATIENT_OBJECT as PatientType);

      prisma.organizationalUnit.findUnique.mockResolvedValueOnce({
        id: 'orgUnit-1',
      } as OrganizationalUnitType);

      prisma.visit.create.mockResolvedValueOnce({
        id: 'visit-1',
        patientId: 'patient-1',
        patient: PATIENT_OBJECT,
      } as VisitWithPatient);

      const result = await service.create(SERVICE_DATA);

      expect(requestContext.withAudit).toHaveBeenCalledTimes(1);
      expect(requestContext.withAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          actionDetails: expect.stringContaining(
            'Visit created for patient patient-1 in org unit orgUnit-1',
          ),
          newValues: SERVICE_DATA,
        }),
        expect.any(Function),
      );

      expect(result).toMatchObject(
        expect.objectContaining({
          patient: expect.objectContaining(PATIENT_OBJECT),
        }),
      );
    });

    it('should throw error if patient not found', async () => {
      prisma.patient.findUnique.mockResolvedValueOnce(null);

      await expect(service.create(SERVICE_DATA)).rejects.toMatchObject({
        name: 'AppError',
        message: 'Patient not found',
      });
    });

    it('should throw error if organizational unit not found', async () => {
      prisma.patient.findUnique.mockResolvedValueOnce(PATIENT_OBJECT as PatientType);

      prisma.organizationalUnit.findUnique.mockResolvedValueOnce(null);

      await expect(service.create(SERVICE_DATA)).rejects.toMatchObject({
        name: 'AppError',
        message: 'Organizational unit not found',
      });
    });
  });

  describe('updateStatus', () => {
    const SERVICE_DATA = { id: 'visit-1', status: 'PLANNED' } as Prisma.VisitGetPayload<{}>;

    it('should update visit status successfully', async () => {
      prisma.visit.findUnique.mockResolvedValueOnce(SERVICE_DATA);

      prisma.visit.update.mockResolvedValueOnce({
        ...SERVICE_DATA,
        status: 'IN_PROGRESS',
      });

      const result = await service.updateStatus(SERVICE_DATA.id, { status: 'IN_PROGRESS' });

      expect(requestContext.withAudit).toHaveBeenCalledTimes(1);
      expect(requestContext.withAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          actionDetails: expect.stringContaining(
            'Visit visit-1 status changed from PLANNED to IN_PROGRESS',
          ),
          oldValues: { status: SERVICE_DATA.status },
          newValues: { status: 'IN_PROGRESS' },
        }),
        expect.any(Function),
      );
      expect(result).toMatchObject(expect.objectContaining({ status: 'IN_PROGRESS' }));
    });

    it('should throw error if visit not found', async () => {
      prisma.visit.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.updateStatus('visit-1', { status: 'IN_PROGRESS' }),
      ).rejects.toMatchObject({
        name: 'AppError',
        message: 'Visit not found',
      });
    });
  });
});
