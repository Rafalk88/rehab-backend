import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import type { PrismaClient } from '@prisma/client';

export type MockPrisma = DeepMockProxy<PrismaClient>;

export const createPrismaMock = (): MockPrisma => {
  const prisma = mockDeep<PrismaClient>();

  delete prisma.$extends;

  return prisma;
};
