import { findAllPatientsSchema, type FindAllPatientsDto } from './patients.schema.js';
import { PatientsService } from './patients.service.js';
import { AuthorizationGuard } from '#common/guards/authorization.guard.js';
import { ZodValidationPipe } from '#common/pipes/zod-validation.pipe.js';
import { JwtAuthGuard } from '#modules/auth/v1/guards/jwt-auth.guard.js';
import { Controller, Get, Param, Query, UseGuards, UsePipes } from '@nestjs/common';

/**
 * PatientsController
 *
 * Handles HTTP requests for patient data.
 *
 * All routes are protected by JwtAuthGuard and AuthorizationGuard.
 * PESEL is decrypted before returning — access requires appropriate permissions.
 *
 * Routes:
 * - GET /api/v1/patients        - paginated list of patients
 * - GET /api/v1/patients/:id    - single patient by ID
 */
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  /**
   * Returns paginated list of patients.
   * GET /api/v1/patients?page=1&limit=20
   */
  @Get()
  @UsePipes(new ZodValidationPipe(findAllPatientsSchema))
  findAll(@Query() query: FindAllPatientsDto) {
    return this.patientsService.findAll(query.page, query.limit);
  }

  /**
   * Returns single patient by ID.
   * GET /api/v1/patients/:id
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.patientsService.findOne(id);
  }
}
