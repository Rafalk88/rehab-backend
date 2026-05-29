import { jest } from '@jest/globals';
import { PatientsService } from './patients.service.js';
import { RequestContextService } from '#context/request-context.service.js';
import { PrismaService } from '#prisma/prisma.service.js';
import { createPrismaMock, type MockPrisma } from '#tests/helpers/prisma-mock.js';
import { Test, TestingModule } from '@nestjs/testing';

describe('PatientsService', () => {
  let service: PatientsService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        {
          provide: RequestContextService,
          useValue: {
            get: jest.fn().mockReturnValue({ userId: 'user-1', ipAddress: '127.0.0.1' }),
            withAudit: jest.fn().mockImplementation(async (_, fn) => (fn as () => Promise<any>)()),
          },
        },
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<PatientsService>(PatientsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
