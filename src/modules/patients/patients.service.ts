import type { CreatePatientDto } from './patients.schema.js';
import { AppError } from '#common/errors/app.error.js';
import { RequestContextService } from '#context/request-context.service.js';
import { aesGcmDecrypt, aesGcmEncrypt, computeHmac } from '#lib/encryption.util.js';
import { PrismaService } from '#prisma/prisma.service.js';
import { Injectable } from '@nestjs/common';

const CURRENT_KEY_VERSION = 1;

/**
 * PatientsService
 *
 * Provides data access and business logic for patient management.
 *
 * Responsibilities:
 * - Retrieving paginated list of patients with decrypted PESEL,
 * - Retrieving single patient by ID with full personal data,
 * - Creating new patients with encrypted PESEL,
 * - Enforcing soft-delete pattern (deletedAt filter).
 *
 * This service integrates:
 * - `PrismaService` for database access,
 * - `aesGcmDecrypt/aesGcmEncrypt` for PESEL encryption,
 * - `computeHmac` for PESEL search index,
 * - `RequestContextService` for audit context.
 *
 * Security note:
 * - PESEL is stored encrypted in DB and decrypted only on read,
 * - Access to this service should be protected by AuthorizationGuard
 *   with appropriate permissions (e.g. 'patient.read').
 */
@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {}

  /**
   * Returns paginated list of patients with decrypted PESEL.
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
   * Returns single patient by ID with full personal data.
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

  /**
   * Creates a new patient with encrypted PESEL.
   * Checks for duplicate PESEL before creating.
   *
   * @param data - Patient creation data
   * @param createdBy - ID of the user creating the patient
   * @returns Newly created patient
   *
   * @throws AppError 'conflict' if patient with this PESEL already exists
   */
  async create(data: CreatePatientDto) {
    const context = this.requestContext.get();
    const createdBy = context?.userId ?? null;

    const peselHmac = computeHmac(data.pesel, CURRENT_KEY_VERSION);

    // Check for duplicate PESEL
    const existing = await this.prisma.patient.findUnique({
      where: { peselHmac },
    });
    if (existing) throw new AppError('conflict', 'Patient with this PESEL already exists');

    const peselEncrypted = aesGcmEncrypt(data.pesel, CURRENT_KEY_VERSION);

    // Get or create firstName
    const firstNameEntry = await this.prisma.givenName.upsert({
      where: { firstName: data.firstName.toLowerCase() },
      update: {},
      create: { firstName: data.firstName.toLowerCase(), createdBy },
    });

    // Get or create secondName if provided
    const secondNameEntry = data.secondName
      ? await this.prisma.givenName.upsert({
          where: { firstName: data.secondName.toLowerCase() },
          update: {},
          create: { firstName: data.secondName.toLowerCase(), createdBy },
        })
      : null;

    // Get or create surname
    const surnameEntry = await this.prisma.surname.upsert({
      where: { surname: data.surname.toLowerCase() },
      update: {},
      create: { surname: data.surname.toLowerCase(), createdBy },
    });

    const patient = await this.requestContext.withAudit(
      {
        actionDetails: `Patient created with PESEL hmac ${peselHmac}`,
        newValues: { peselHmac, firstNameId: firstNameEntry.id, surnameId: surnameEntry.id },
      },
      () =>
        this.prisma.patient.create({
          data: {
            peselHmac,
            peselEncrypted,
            keyVersion: CURRENT_KEY_VERSION,
            firstNameId: firstNameEntry.id,
            secondNameId: secondNameEntry?.id ?? null,
            surnameId: surnameEntry.id,
            dateOfBirth: new Date(data.dateOfBirth),
            sexId: data.sexId ?? null,
            peselStatus: data.peselStatus,
            createdBy,
            updatedBy: createdBy,
          },
          include: {
            firstName: true,
            secondName: true,
            surname: true,
            sex: true,
          },
        }),
    );

    return {
      ...patient,
      pesel: aesGcmDecrypt(patient.peselEncrypted),
    };
  }
}
