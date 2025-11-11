import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { computeHmac, aesGcmEncrypt, maskString } from '../lib/encryption.util.js';
import { hashPassword } from '../lib/password.util.js';

const CURRENT_KEY_VERSION = 1;

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

    const login = 'tuser';
    const email = `${login}@vitala.com`;

    const loginHmac = computeHmac(login, CURRENT_KEY_VERSION);
    const loginEncrypted = aesGcmEncrypt(login, CURRENT_KEY_VERSION);
    const loginMasked = maskString(login);

    const emailHmac = computeHmac(email, CURRENT_KEY_VERSION);
    const emailEncrypted = aesGcmEncrypt(email, CURRENT_KEY_VERSION);
    const emailMasked = maskString(email);

    const passwordHash = await hashPassword('Test2025!!!!');

    await this.prisma.user.upsert({
      where: { loginHmac },
      update: {},
      create: {
        loginHmac,
        loginEncrypted,
        loginMasked,
        emailHmac,
        emailEncrypted,
        emailMasked,
        passwordHash,
        keyVersion: CURRENT_KEY_VERSION,
        mustChangePassword: false,
        isActive: true,
        firstNameId: firstName.id,
        surnameId: surname.id,
      },
    });
  }
}
