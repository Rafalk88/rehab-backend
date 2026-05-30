import type {
  CreateVisitDto,
  FindAllVisitsDto,
  UpdateVisitDto,
  UpdateVisitStatusDto,
} from './visits.schema.js';
import { AppError } from '#common/errors/app.error.js';
import { RequestContextService } from '#context/request-context.service.js';
import { PrismaService } from '#prisma/prisma.service.js';
import { Injectable } from '@nestjs/common';

/**
 * VisitsService
 *
 * Provides data access and business logic for visit management.
 *
 * Responsibilities:
 * - Retrieving paginated list of visits filtered by org unit and date,
 * - Creating new visits,
 * - Updating visit status (checkbox on list),
 * - Updating visit data (notes, assignedTo).
 *
 * Security note:
 * - Access should be protected by AuthorizationGuard.
 */
@Injectable()
export class VisitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {}

  /**
   * Returns paginated list of visits filtered by orgId and optionally date and status.
   */
  async findAll(query: FindAllVisitsDto) {
    const { orgId, date, status, page, limit } = query;
    const skip = (page - 1) * limit;

    const where = {
      organizationalUnitId: orgId,
      deletedAt: null,
      ...(status && { status }),
      ...(date && {
        date: {
          gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
          lte: new Date(new Date(date).setHours(23, 59, 59, 999)),
        },
      }),
    };

    const [visits, total] = await Promise.all([
      this.prisma.visit.findMany({
        skip,
        take: limit,
        where,
        include: {
          patient: {
            include: {
              firstName: true,
              surname: true,
            },
          },
          assignedTo: {
            include: {
              firstName: true,
              surname: true,
            },
          },
        },
        orderBy: { date: 'asc' },
      }),
      this.prisma.visit.count({ where }),
    ]);

    return {
      data: visits,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Creates a new visit.
   */
  async create(data: CreateVisitDto) {
    const context = this.requestContext.get();
    const createdBy = context?.userId ?? null;

    const patient = await this.prisma.patient.findUnique({
      where: { id: data.patientId },
    });
    if (!patient) throw new AppError('not_found', 'Patient not found');

    const orgUnit = await this.prisma.organizationalUnit.findUnique({
      where: { id: data.organizationalUnitId },
    });
    if (!orgUnit) throw new AppError('not_found', 'Organizational unit not found');

    return this.requestContext.withAudit(
      {
        actionDetails: `Visit created for patient ${data.patientId} in org unit ${data.organizationalUnitId}`,
        newValues: { ...data },
      },
      () =>
        this.prisma.visit.create({
          data: {
            patientId: data.patientId,
            organizationalUnitId: data.organizationalUnitId,
            assignedToId: data.assignedToId ?? null,
            date: new Date(data.date),
            notes: data.notes ?? null,
            createdBy,
            updatedBy: createdBy,
          },
          include: {
            patient: {
              include: {
                firstName: true,
                surname: true,
              },
            },
          },
        }),
    );
  }

  /**
   * Updates visit status only.
   */
  async updateStatus(id: string, data: UpdateVisitStatusDto) {
    const visit = await this.prisma.visit.findUnique({ where: { id } });
    if (!visit) throw new AppError('not_found', 'Visit not found');

    return this.requestContext.withAudit(
      {
        actionDetails: `Visit ${id} status changed from ${visit.status} to ${data.status}`,
        oldValues: { status: visit.status },
        newValues: { status: data.status },
      },
      () =>
        this.prisma.visit.update({
          where: { id },
          data: { status: data.status },
        }),
    );
  }

  /**
   * Updates visit data (notes, assignedTo, date).
   */
  async update(id: string, data: UpdateVisitDto) {
    const visit = await this.prisma.visit.findUnique({ where: { id } });
    if (!visit) throw new AppError('not_found', 'Visit not found');

    const context = this.requestContext.get();
    const updatedBy = context?.userId ?? null;

    return this.requestContext.withAudit(
      {
        actionDetails: `Visit ${id} updated`,
        oldValues: {
          assignedToId: visit.assignedToId,
          date: visit.date,
          notes: visit.notes,
        },
        newValues: { ...data },
      },
      () =>
        this.prisma.visit.update({
          where: { id },
          data: {
            ...(data.assignedToId && { assignedToId: data.assignedToId }),
            ...(data.date && { date: new Date(data.date) }),
            ...(data.notes !== undefined && { notes: data.notes }),
            updatedBy,
          },
        }),
    );
  }
}
