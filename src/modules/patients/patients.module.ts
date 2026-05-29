import { PatientsController } from './patients.controller.js';
import { PatientsService } from './patients.service.js';
import { PermissionsModule } from '#modules/permissions/permissions.module.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [PermissionsModule],
  controllers: [PatientsController],
  providers: [PatientsService],
})
export class PatientsModule {}
