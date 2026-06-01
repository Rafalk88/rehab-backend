import { PrismaService } from '#prisma/prisma.service.js';
import { Injectable } from '@nestjs/common';

/**
 * This service provides method to retrieve organizational units from the database using Prisma ORM.
 */
@Injectable()
export class OrganizationalUnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrganizationalUnits() {
    return this.prisma.organizationalUnit.findMany();
  }
}
