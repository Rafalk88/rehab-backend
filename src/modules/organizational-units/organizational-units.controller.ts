import { OrganizationalUnitsService } from './organizational-units.service.js';
import { AuthorizationGuard } from '#common/guards/authorization.guard.js';
import { JwtAuthGuard } from '#modules/auth/v1/guards/jwt-auth.guard.js';
import { Permissions } from '#modules/permissions/decorators/permission.decorator.js';
import { Controller, UseGuards, Get } from '@nestjs/common';

@Controller('organizational-units')
export class OrganizationalUnitsController {
  constructor(private readonly organizationalUnitsService: OrganizationalUnitsService) {}

  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @Permissions('org_units.read')
  @Get()
  async getOrganizationalUnits() {
    return this.organizationalUnitsService.getOrganizationalUnits();
  }
}
