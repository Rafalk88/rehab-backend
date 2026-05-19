import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import type { PrismaClient } from '#generated/prisma/client.js';

export type MockPrisma = DeepMockProxy<PrismaClient>;

export const createPrismaMock = (): MockPrisma => {
  const prisma = mockDeep<PrismaClient>();

  delete (prisma as Partial<PrismaClient>).$extends;

  return prisma;
};
