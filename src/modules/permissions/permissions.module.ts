import { PermissionsService } from './permissions.service.js';
import { AuthorizationGuard } from '#common/guards/authorization.guard.js';
import { Module } from '@nestjs/common';

@Module({
  providers: [PermissionsService, AuthorizationGuard],
  exports: [PermissionsService],
})
export class PermissionsModule {}
