import { AppError } from '#common/errors/app.error.js';
import { aesGcmDecrypt } from '#lib/encryption.util.js';
import { PrismaService } from '#prisma/prisma.service.js';
import { Injectable } from '@nestjs/common';

/**
 * PatientsService
 *
 * Provides data access and business logic for patient management.
 *
 * Responsibilities:
 * - Retrieving paginated list of patients with decrypted PESEL,
 * - Retrieving single patient by ID with full personal data,
 * - Enforcing soft-delete pattern (deletedAt filter).
 *
 * This service integrates:
 * - `PrismaService` for database access,
 * - `aesGcmDecrypt` for decrypting sensitive patient data (PESEL).
 *
 * Security note:
 * - PESEL is stored encrypted in DB and decrypted only on read,
 * - Access to this service should be protected by AuthorizationGuard
 *   with appropriate permissions (e.g. 'patient.read').
 *
 * Example usage:
 * ```ts
 * const patients = await patientsService.findAll(1, 20);
 * // { data: [...], meta: { total, page, limit, totalPages } }
 *
 * const patient = await patientsService.findOne('uuid');
 * // { id, firstName, surname, pesel, ... }
 * ```
 */
@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns paginated list of patients.
   * @param page - Page number (default 1)
   * @param limit - Items per page (default 20)
   */
  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({
        skip,
        take: limit,
        where: { deletedAt: null },
        include: {
          firstName: true,
          surname: true,
          sex: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.patient.count({ where: { deletedAt: null } }),
    ]);

    return {
      data: patients.map((p) => ({
        ...p,
        pesel: aesGcmDecrypt(p.peselEncrypted),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Returns single patient by ID.
   * @param id - Patient UUID
   */
  async findOne(id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        firstName: true,
        secondName: true,
        surname: true,
        sex: true,
      },
    });

    if (!patient) throw new AppError('not_found', 'Patient not found');

    return {
      ...patient,
      pesel: aesGcmDecrypt(patient.peselEncrypted),
    };
  }
}
