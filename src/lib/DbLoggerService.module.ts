import { DbLoggerService } from './DbLoggerService.js';
import { PrismaModule } from '#prisma/prisma.module.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule],
  providers: [DbLoggerService],
  exports: [DbLoggerService],
})
export class DbLoggerModule {}
