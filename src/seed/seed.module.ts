import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SeedService } from './seed.service.js';

@Module({
  providers: [SeedService, PrismaService],
  exports: [SeedService],
})
export class SeedModule {}
