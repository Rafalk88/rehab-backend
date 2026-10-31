import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient } from '#generated/prisma/client.js';
import {
  ACTIONS,
  PERMISSIONS,
  ALL_PERMISSIONS,
  type Permission,
} from '#modules/permissions/permissions.constants.js';
import { SEED_PRISMA } from './seed.tokens.js';
import { computeHmac, aesGcmEncrypt, maskString } from '../lib/encryption.util.js';
import { hashPassword } from '../lib/password.util.js';

const CURRENT_KEY_VERSION = 1;
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

@Injectable()
export class SeedService {
  constructor(@Inject(SEED_PRISMA) private readonly prisma: PrismaClient) {}

  async seedSystemUser() {
    await this.prisma.user.upsert({
      where: { loginHmac: computeHmac('system', CURRENT_KEY_VERSION) },
      update: {},
      create: {
        id: SYSTEM_USER_ID,
        loginHmac: computeHmac('system', CURRENT_KEY_VERSION),
        loginEncrypted: aesGcmEncrypt('system', CURRENT_KEY_VERSION),
        loginMasked: 'system',
        emailHmac: computeHmac('system@vitala.com', CURRENT_KEY_VERSION),
        emailEncrypted: aesGcmEncrypt('system@vitala.com', CURRENT_KEY_VERSION),
        emailMasked: 'system@vitala.com',
        passwordHash: await hashPassword('System2025!!!!'),
        keyVersion: CURRENT_KEY_VERSION,
        mustChangePassword: false,
        isActive: true,
        createdBy: SYSTEM_USER_ID,
        updatedBy: SYSTEM_USER_ID,
      },
    });
  }

  async seedSexModel() {
    const sexes = ['mężczyzna', 'kobieta', 'nienadane'];
    for (const sex of sexes) {
      await this.prisma.sex.upsert({
        where: { sex },
        update: {},
        create: { sex, createdBy: SYSTEM_USER_ID, updatedBy: SYSTEM_USER_ID },
      });
    }
  }

  async seedRoles() {
    const roles = [
      { name: 'system.admin', description: 'Full system access for maintenance and audits' },
      { name: 'system.auditor', description: 'Read-only access for audits and compliance' },
      { name: 'org.admin', description: 'Administrator of a medical organization' },
      { name: 'org.doctor', description: 'Doctor with access to assigned patient records' },
      { name: 'org.nurse', description: 'Nursing staff access to patient records' },
      { name: 'org.receptionist', description: 'Handles appointments and patient intake' },
      { name: 'user.blocked', description: 'Blocked or deactivated account' },
    ];

    for (const role of roles) {
      await this.prisma.role.upsert({
        where: { name: role.name },
        update: {},
        create: {
          name: role.name,
          description: role.description,
          createdBy: SYSTEM_USER_ID,
          updatedBy: SYSTEM_USER_ID,
        },
      });
    }
  }

  async seedRolePermissions() {
    const map: Record<string, Permission[]> = {
      'system.admin': ALL_PERMISSIONS,
      'system.auditor': ALL_PERMISSIONS.filter((p) => p.endsWith(`.${ACTIONS.READ}`)),
      'org.admin': [
        PERMISSIONS.PATIENTS.READ,
        PERMISSIONS.PATIENTS.CREATE,
        PERMISSIONS.VISITS.READ,
        PERMISSIONS.VISITS.CREATE,
        PERMISSIONS.VISITS.UPDATE,
        PERMISSIONS.VISITS.UPDATE_STATUS,
        PERMISSIONS.ORG_UNITS.READ,
        PERMISSIONS.ORG_UNITS.CREATE,
        PERMISSIONS.ORG_UNITS.UPDATE,
        PERMISSIONS.ORG_UNITS.DELETE,
        PERMISSIONS.USERS.READ,
        PERMISSIONS.USERS.CREATE,
        PERMISSIONS.USERS.UPDATE,
      ],
      'org.doctor': [
        PERMISSIONS.PATIENTS.READ,
        PERMISSIONS.VISITS.READ,
        PERMISSIONS.VISITS.UPDATE_STATUS,
        PERMISSIONS.ORG_UNITS.READ,
      ],
      'org.nurse': [
        PERMISSIONS.PATIENTS.READ,
        PERMISSIONS.VISITS.READ,
        PERMISSIONS.VISITS.UPDATE_STATUS,
        PERMISSIONS.ORG_UNITS.READ,
      ],
      'org.receptionist': [
        PERMISSIONS.PATIENTS.READ,
        PERMISSIONS.PATIENTS.CREATE,
        PERMISSIONS.VISITS.READ,
        PERMISSIONS.VISITS.CREATE,
        PERMISSIONS.ORG_UNITS.READ,
      ],
      'user.blocked': [],
    };

    for (const [roleName, perms] of Object.entries(map)) {
      const role = await this.prisma.role.findUniqueOrThrow({ where: { name: roleName } });

      for (const permission of perms) {
        await this.prisma.rolePermission.upsert({
          where: { roleId_permission: { roleId: role.id, permission } },
          update: {},
          create: { roleId: role.id, permission },
        });
      }

      await this.prisma.rolePermission.deleteMany({
        where: { roleId: role.id, permission: { notIn: perms } },
      });
    }
  }

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

    const login = 'tuser';
    const email = `${login}@vitala.com`;

    const loginHmac = computeHmac(login, CURRENT_KEY_VERSION);
    const loginEncrypted = aesGcmEncrypt(login, CURRENT_KEY_VERSION);
    const loginMasked = maskString(login);

    const emailHmac = computeHmac(email, CURRENT_KEY_VERSION);
    const emailEncrypted = aesGcmEncrypt(email, CURRENT_KEY_VERSION);
    const emailMasked = `${loginMasked}@vitala.com`;

    const passwordHash = await hashPassword('Test2025!!!!');

    const male = await this.prisma.sex.findUnique({ where: { sex: 'mężczyzna' } });
    if (!male) throw new Error('Sex not found');

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

  async seedNurseUser() {
    const firstName = await this.prisma.givenName.upsert({
      where: { firstName: 'Anna' },
      update: {},
      create: { firstName: 'Anna', createdBy: SYSTEM_USER_ID, updatedBy: SYSTEM_USER_ID },
    });

    const surname = await this.prisma.surname.upsert({
      where: { surname: 'Nowak' },
      update: {},
      create: { surname: 'Nowak', createdBy: SYSTEM_USER_ID, updatedBy: SYSTEM_USER_ID },
    });

    const login = 'anowak';
    const email = `${login}@vitala.com`;

    const loginHmac = computeHmac(login, CURRENT_KEY_VERSION);
    const loginEncrypted = aesGcmEncrypt(login, CURRENT_KEY_VERSION);
    const loginMasked = maskString(login);

    const emailHmac = computeHmac(email, CURRENT_KEY_VERSION);
    const emailEncrypted = aesGcmEncrypt(email, CURRENT_KEY_VERSION);
    const emailMasked = `${loginMasked}@vitala.com`;

    const passwordHash = await hashPassword('Nurse2025!!!!');

    const male = await this.prisma.sex.findUnique({ where: { sex: 'kobieta' } });
    if (!male) throw new Error('Sex not found');

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

  async seedBlockedUser() {
    const firstName = await this.prisma.givenName.upsert({
      where: { firstName: 'blocked' },
      update: {},
      create: { firstName: 'blocked', createdBy: SYSTEM_USER_ID, updatedBy: SYSTEM_USER_ID },
    });

    const surname = await this.prisma.surname.upsert({
      where: { surname: 'user' },
      update: {},
      create: { surname: 'user', createdBy: SYSTEM_USER_ID, updatedBy: SYSTEM_USER_ID },
    });

    const login = 'buser';
    const email = `${login}@vitala.com`;

    const loginHmac = computeHmac(login, CURRENT_KEY_VERSION);
    const loginEncrypted = aesGcmEncrypt(login, CURRENT_KEY_VERSION);
    const loginMasked = maskString(login);

    const emailHmac = computeHmac(email, CURRENT_KEY_VERSION);
    const emailEncrypted = aesGcmEncrypt(email, CURRENT_KEY_VERSION);
    const emailMasked = `${loginMasked}@vitala.com`;

    const passwordHash = await hashPassword('Blocked2025!!!!');

    const male = await this.prisma.sex.findUnique({ where: { sex: 'mężczyzna' } });
    if (!male) throw new Error('Sex not found');

    await this.prisma.user.upsert({
      where: { loginHmac },
      update: {},
      create: {
        isLocked: true,
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

  async seedUserRoles() {
    const users = [
      { login: 't***r', role: 'system.admin' },
      { login: 'b***r', role: 'user.blocked' },
      { login: 'a****k', role: 'org.nurse' },
    ];

    for (const { login, role } of users) {
      const user = await this.prisma.user.findFirst({
        where: { loginMasked: login },
      });
      const roleRecord = await this.prisma.role.findUnique({
        where: { name: role },
      });

      if (!user || !roleRecord) {
        console.warn(`⚠️ Pominięto: user=${login} role=${role}`);
        continue;
      }

      await this.prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: roleRecord.id } },
        update: {},
        create: {
          userId: user.id,
          roleId: roleRecord.id,
          assignedById: SYSTEM_USER_ID,
        },
      });
    }
  }

  async seedOrganizationalUnits() {
    const organizationalUnits = [
      { name: 'POR11', description: 'Poradnia rehabilitacyjna', createdBy: SYSTEM_USER_ID },
      { name: 'POR19', description: 'Zakład rehabilitacji leczniczej', createdBy: SYSTEM_USER_ID },
    ];

    for (const { name, description } of organizationalUnits) {
      await this.prisma.organizationalUnit.upsert({
        where: { name },
        update: {},
        create: { name, description, createdBy: SYSTEM_USER_ID, updatedBy: SYSTEM_USER_ID },
      });
    }
  }

  async seedPatients() {
    const pesel1 = '90010112345';
    const pesel2 = '85030267890';

    const firstName1 = await this.prisma.givenName.upsert({
      where: { firstName: 'Jan' },
      update: {},
      create: { firstName: 'Jan', createdBy: SYSTEM_USER_ID, updatedBy: SYSTEM_USER_ID },
    });

    const surname1 = await this.prisma.surname.upsert({
      where: { surname: 'Kowalski' },
      update: {},
      create: { surname: 'Kowalski', createdBy: SYSTEM_USER_ID, updatedBy: SYSTEM_USER_ID },
    });

    const firstName2 = await this.prisma.givenName.upsert({
      where: { firstName: 'Anna' },
      update: {},
      create: { firstName: 'Anna', createdBy: SYSTEM_USER_ID, updatedBy: SYSTEM_USER_ID },
    });

    const surname2 = await this.prisma.surname.upsert({
      where: { surname: 'Nowak' },
      update: {},
      create: { surname: 'Nowak', createdBy: SYSTEM_USER_ID, updatedBy: SYSTEM_USER_ID },
    });

    const male = await this.prisma.sex.findUnique({ where: { sex: 'mężczyzna' } });
    const female = await this.prisma.sex.findUnique({ where: { sex: 'kobieta' } });

    if (!male || !female) throw new Error('Sex not found');

    const patient1 = await this.prisma.patient.upsert({
      where: { peselHmac: computeHmac(pesel1, CURRENT_KEY_VERSION) },
      update: {},
      create: {
        peselHmac: computeHmac(pesel1, CURRENT_KEY_VERSION),
        peselEncrypted: aesGcmEncrypt(pesel1, CURRENT_KEY_VERSION),
        keyVersion: CURRENT_KEY_VERSION,
        firstNameId: firstName1.id,
        surnameId: surname1.id,
        dateOfBirth: new Date('1990-01-01'),
        sexId: male.id,
        peselStatus: 'ASSIGNED',
        createdBy: SYSTEM_USER_ID,
        updatedBy: SYSTEM_USER_ID,
      },
    });

    const patient2 = await this.prisma.patient.upsert({
      where: { peselHmac: computeHmac(pesel2, CURRENT_KEY_VERSION) },
      update: {},
      create: {
        peselHmac: computeHmac(pesel2, CURRENT_KEY_VERSION),
        peselEncrypted: aesGcmEncrypt(pesel2, CURRENT_KEY_VERSION),
        keyVersion: CURRENT_KEY_VERSION,
        firstNameId: firstName2.id,
        surnameId: surname2.id,
        dateOfBirth: new Date('1985-03-02'),
        sexId: female.id,
        peselStatus: 'ASSIGNED',
        createdBy: SYSTEM_USER_ID,
        updatedBy: SYSTEM_USER_ID,
      },
    });

    return { patient1, patient2 };
  }

  async seedVisits() {
    const unit = await this.prisma.organizationalUnit.findUnique({
      where: { name: 'POR19' },
    });

    if (!unit) throw new Error('OrganizationalUnit not found');

    const { patient1, patient2 } = await this.seedPatients();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ONE_DAY_IN_MS = 86400000;

    const visits = [
      {
        patientId: patient1.id,
        plannedDate: new Date(today.getTime() + 8 * ONE_DAY_IN_MS),
        status: 'PLANNED',
      },
      {
        patientId: patient1.id,
        plannedDate: new Date(today.getTime() - 4 * ONE_DAY_IN_MS),
        registerDate: today,
        ewusVerifiedAt: new Date(today),
        status: 'IN_PROGRESS',
      },
      { patientId: patient2.id, plannedDate: today, status: 'PLANNED' },
      {
        patientId: patient2.id,
        plannedDate: new Date(today.getTime() + 3 * ONE_DAY_IN_MS),
        status: 'PLANNED',
      },
      {
        patientId: patient1.id,
        plannedDate: new Date(today.getTime() - 10 * ONE_DAY_IN_MS),
        registerDate: new Date(today.getTime() - ONE_DAY_IN_MS),
        completionDate: new Date(today.getTime() - ONE_DAY_IN_MS),
        ewusVerifiedAt: new Date(today),
        billed: true,
        status: 'COMPLETED',
      },
    ];

    for (const visit of visits) {
      await this.prisma.visit.create({
        data: {
          patientId: visit.patientId,
          organizationalUnitId: unit.id,
          plannedDate: visit.plannedDate,
          registerDate: visit.registerDate,
          completionDate: visit.completionDate,
          ewusVerifiedAt: visit.ewusVerifiedAt,
          billed: visit.billed,
          status: visit.status as any,
          createdBy: SYSTEM_USER_ID,
          updatedBy: SYSTEM_USER_ID,
        },
      });
    }
  }
}
