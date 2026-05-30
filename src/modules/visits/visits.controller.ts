import { VisitsService } from './visits.service.js';
import {
  findAllVisitsSchema,
  createVisitSchema,
  updateVisitStatusSchema,
  updateVisitSchema,
  type FindAllVisitsDto,
  type CreateVisitDto,
  type UpdateVisitStatusDto,
  type UpdateVisitDto,
} from './visits.schema.js';
import { AuthorizationGuard } from '#common/guards/authorization.guard.js';
import { ZodValidationPipe } from '#common/pipes/zod-validation.pipe.js';
import { JwtAuthGuard } from '#modules/auth/v1/guards/jwt-auth.guard.js';
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  UsePipes,
} from '@nestjs/common';

/**
 * VisitsController
 *
 * Handles HTTP requests for visit management.
 *
 * All routes are protected by JwtAuthGuard and AuthorizationGuard.
 *
 * Routes:
 * - GET /api/v1/visits?orgId=&date=&status=&page=&limit=  - paginated list
 * - POST /api/v1/visits                                   - create visit
 * - PATCH /api/v1/visits/:id/status                       - update status only
 * - PATCH /api/v1/visits/:id                              - update visit data
 */
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('visits')
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  /**
   * Returns paginated list of visits filtered by org unit and date.
   * GET /api/v1/visits?orgId=uuid&date=2026-05-29T00:00:00.000Z
   */
  @Get()
  @UsePipes(new ZodValidationPipe(findAllVisitsSchema))
  findAll(@Query() query: FindAllVisitsDto) {
    return this.visitsService.findAll(query);
  }

  /**
   * Creates a new visit.
   * POST /api/v1/visits
   */
  @Post()
  @UsePipes(new ZodValidationPipe(createVisitSchema))
  create(@Body() body: CreateVisitDto) {
    return this.visitsService.create(body);
  }

  /**
   * Updates visit status only — used for checkbox on list.
   * PATCH /api/v1/visits/:id/status
   */
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateVisitStatusSchema)) body: UpdateVisitStatusDto,
  ) {
    return this.visitsService.updateStatus(id, body);
  }

  /**
   * Updates visit data (notes, assignedTo, date).
   * PATCH /api/v1/visits/:id
   */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateVisitSchema)) body: UpdateVisitDto,
  ) {
    return this.visitsService.update(id, body);
  }
}
