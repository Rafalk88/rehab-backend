import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service.js';
import { DbLoggerService } from '@lib/DbLoggerService.js';
import { PermissionsAdminService } from './permissions-admin.service.js';
import { PermissionsAdminController } from './permissions-admin.controller.js';

@Module({
  controllers: [PermissionsAdminController],
  providers: [PermissionsAdminService, PrismaService, DbLoggerService],
  exports: [PermissionsAdminService],
})
export class PermissionsAdminModule {}
