import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { hashPassword } from '../lib/password.util.js';

@Injectable()
export class SeedService {
  constructor(private readonly prisma: PrismaService) {}

  async seedTestUser() {
    const firstName = await this.prisma.givenName.upsert({
      where: { firstName: 'test' },
      update: {},
      create: { firstName: 'test' },
    });

    const surname = await this.prisma.surname.upsert({
      where: { surname: 'user' },
      update: {},
      create: { surname: 'user' },
    });

    const passwordHash = await hashPassword('Test2025!!!!');

    await this.prisma.user.upsert({
      where: { login: 'tuser' },
      update: {},
      create: {
        login: 'tuser',
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
