import { VisitsController } from './visits.controller.js';
import { VisitsService } from './visits.service.js';
import { PermissionsModule } from '#modules/permissions/permissions.module.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [PermissionsModule],
  controllers: [VisitsController],
  providers: [VisitsService],
})
export class VisitsModule {}
