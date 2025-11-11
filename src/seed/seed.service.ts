import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { computeHmac, aesGcmEncrypt, maskString } from '../lib/encryption.util.js';
import { hashPassword } from '../lib/password.util.js';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

@Injectable()
export class SeedService {
  constructor(private readonly prisma: PrismaService) {}

  async seedTestUser() {
    const firstName = await this.prisma.givenName.upsert({
      where: { firstName: 'test' },
      update: {},
      create: { firstName: 'test', createdBy: SYSTEM_USER_ID, updatedBy: SYSTEM_USER_ID },
    });

    const surname = await this.prisma.surname.upsert({
      where: { surname: 'user' },
      update: {},
      create: { surname: 'user', createdBy: SYSTEM_USER_ID, updatedBy: SYSTEM_USER_ID },
    });

    const sexes = ['mężczyzna', 'kobieta', 'nienadane'];
    for (const sex of sexes) {
      await this.prisma.sex.upsert({
        where: { sex },
        update: {},
        create: { sex, createdBy: SYSTEM_USER_ID, updatedBy: SYSTEM_USER_ID },
      });
    }

    const login = 'tuser';
    const email = `${login}@vitala.com`;
    const CURRENT_KEY_VERSION = 1;

    const loginHmac = computeHmac(login, CURRENT_KEY_VERSION);
    const loginEncrypted = aesGcmEncrypt(login, CURRENT_KEY_VERSION);
    const loginMasked = maskString(login);

    const emailHmac = computeHmac(email, CURRENT_KEY_VERSION);
    const emailEncrypted = aesGcmEncrypt(email, CURRENT_KEY_VERSION);
    const emailMasked = `${loginMasked}@vitala.com`;

    const passwordHash = await hashPassword('Test2025!!!!');

    const male = await this.prisma.sex.findUnique({ where: { sex: 'mężczyzna' } });
    if (!male) throw new Error('Sex "mężczyzna" not found');

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
        sexId: male.id,
        createdBy: SYSTEM_USER_ID,
        updatedBy: SYSTEM_USER_ID,
      },
    });
  }
}
