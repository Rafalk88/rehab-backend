import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { hashPassword } from '../lib/password.util.js';

@Injectable()
export class SeedService {
  constructor(private readonly prisma: PrismaService) {}

  async seedTestUser() {
    const firstName = await this.prisma.givenName.upsert({
      where: { firstName: 'Test' },
      update: {},
      create: { firstName: 'Test' },
    });

    const surname = await this.prisma.surname.upsert({
      where: { surname: 'User' },
      update: {},
      create: { surname: 'User' },
    });

    const passwordHash = await hashPassword('Test2025!!!!');

    await this.prisma.user.upsert({
      where: { login: 'TUser' },
      update: {},
      create: {
        login: 'TUser',
        email: 'tuser@vitala.com',
        passwordHash,
        mustChangePassword: false,
        isActive: true,
        firstNameId: firstName.id,
        surnameId: surname.id,
      },
    });
  }
}
