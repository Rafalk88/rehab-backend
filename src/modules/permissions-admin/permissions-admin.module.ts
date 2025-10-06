import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service.js';
import { DbLoggerService } from '@lib/DbLoggerService.js';
import { PermissionsAdminService } from './permissions-admin.service.js';
import { PermissionsAdminController } from './permissions-admin.controller.js';
import { PermissionsModule } from '../permissions/permissions.module.js';
import { AuthorizationGuard } from '@common/guards/authorization.guard.js';

@Module({
  imports: [PermissionsModule],
  controllers: [PermissionsAdminController],
  providers: [PermissionsAdminService, PrismaService, DbLoggerService, AuthorizationGuard],
  exports: [PermissionsAdminService],
})
export class PermissionsAdminModule {}
