import { VisitsService } from './visits.service.js';
import { RequestContextService } from '#context/request-context.service.js';
import { PrismaService } from '#prisma/prisma.service.js';
import { createPrismaMock, type MockPrisma } from '#tests/helpers/prisma-mock.js';
import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

describe('VisitsService', () => {
  let service: VisitsService;
  let prisma: MockPrisma;

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
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
