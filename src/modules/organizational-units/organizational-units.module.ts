import { OrganizationalUnitsController } from './organizational-units.controller.js';
import { OrganizationalUnitsService } from './organizational-units.service.js';
import { PermissionsModule } from '#modules/permissions/permissions.module.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [PermissionsModule],
  controllers: [OrganizationalUnitsController],
  providers: [OrganizationalUnitsService],
})
export class OrganizationalUnitsModule {}
