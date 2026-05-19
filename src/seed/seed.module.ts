import { Module } from '@nestjs/common';
import { PrismaClient } from '#generated/prisma/client.js';
import { LoggerService } from '../lib/logger/logger.service.js';
import { SeedService } from './seed.service.js';
import { SEED_PRISMA } from './seed.tokens.js';

@Module({
  providers: [
    SeedService,
    LoggerService,
    {
      provide: SEED_PRISMA,
      useFactory: async () => {
        const prisma = new PrismaClient();
        await prisma.$connect();
        return prisma;
      },
    },
  ],
  exports: [SeedService],
})
export class SeedModule {}