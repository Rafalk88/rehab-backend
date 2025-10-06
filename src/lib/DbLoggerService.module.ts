import { Module } from '@nestjs/common';
import { DbLoggerService } from './DbLoggerService.js';
import { PrismaModule } from '@/prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  providers: [DbLoggerService],
  exports: [DbLoggerService],
})
export class DbLoggerModule {}
