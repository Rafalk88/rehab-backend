import { PermissionsAdminController } from './permissions-admin.controller.js';
import { PermissionsAdminService } from './permissions-admin.service.js';
import { PermissionsModule } from '../permissions/permissions.module.js';
import { AuthorizationGuard } from '#common/guards/authorization.guard.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [PermissionsModule],
  controllers: [PermissionsAdminController],
  providers: [PermissionsAdminService, AuthorizationGuard],
  exports: [PermissionsAdminService],
})
export class PermissionsAdminModule {}
