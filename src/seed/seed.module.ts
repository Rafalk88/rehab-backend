import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoggerService } from '../lib/logger/logger.service.js';
import { SeedService } from './seed.service.js';

@Module({
  providers: [SeedService, PrismaService, LoggerService],
  exports: [SeedService],
})
export class SeedModule {}
