import { OrganizationalUnitsService } from './organizational-units.service.js';
import { AuthorizationGuard } from '#common/guards/authorization.guard.js';
import { JwtAuthGuard } from '#modules/auth/v1/guards/jwt-auth.guard.js';
import { Controller, UseGuards, Get } from '@nestjs/common';

@Controller('organizational-units')
export class OrganizationalUnitsController {
  constructor(private readonly organizationalUnitsService: OrganizationalUnitsService) {}

  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @Get()
  async getOrganizationalUnits() {
    return this.organizationalUnitsService.getOrganizationalUnits();
  }
}
