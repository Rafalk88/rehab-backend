import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service.js';
import { AuthorizationGuard } from '@common/guards/authorization.guard.js';

@Module({
  providers: [PermissionsService, AuthorizationGuard],
  exports: [PermissionsService],
})
export class PermissionsModule {}
