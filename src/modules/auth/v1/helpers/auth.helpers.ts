import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service.js';
import { AppError } from '@common/errors/app.error.js';
import { verifyPassword } from '@lib/password.util.js';
import type { User } from '@prisma/client';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

/**
 * AuthHelpers
 *
 * Provides utility methods for user authentication and account management.
 *
 * Responsibilities:
 * - Verifying user credentials and password correctness
 * - Checking account restrictions (inactive, locked, must change password)
 * - Updating user login status after success or failure
 * - Generating unique logins and ensuring first name / surname records exist
 *
 * This class uses:
 * - `PrismaService` for database operations
 * - `AppError` for standardized error handling
 * - Password utilities for hashing and verification
 *
 * Example usage:
 * ```ts
 * const helpers = new AuthHelpers(prismaService);
 *
 * // Verify login credentials
 * await helpers.verifyLoginCredentials(user, 'password123');
 *
 * // Check account restrictions
 * helpers.checkLoginRestrictions(user);
 *
 * // Update user after successful login
 * await helpers.updateLoginSuccess(user.id);
 *
 * // Generate unique login
 * const login = await helpers.generateUniqueLogin('Alice', 'Smith');
 *
 * // Get or create name records
 * const firstNameEntry = await helpers.getOrCreateFirstName('Alice');
 * const surnameEntry = await helpers.getOrCreateSurname('Smith');
 * ```
 */
@Injectable()
export class AuthHelpers {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verifies the user's password.
   *
   * @throws {AppError} 'unauthorized' or 'forbidden' if invalid or account locked
   */
  async verifyLoginCredentials(
    user: {
      id: User['id'];
      failedLoginAttempts: User['failedLoginAttempts'];
      passwordHash: User['passwordHash'];
    },
    password: string,
  ) {
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      const { failedAttempts, lockedUntil } = await this.updateLoginFailure(user.id);
      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        throw new AppError('forbidden', `Account locked until ${lockedUntil?.toISOString()}`);
      }
      throw new AppError('unauthorized', 'Invalid login or password');
    }
  }

  /**
   * Checks account restrictions (inactive, locked, mustChangePassword).
   *
   * @throws {AppError} 'forbidden' if restriction violated
   */
  checkLoginRestrictions(user: {
    isActive: User['isActive'];
    isLocked: User['isLocked'];
    lockedUntil: User['lockedUntil'];
    mustChangePassword: User['mustChangePassword'];
  }) {
    if (!user.isActive) throw new AppError('forbidden', 'Account is inactive');

    if (user.isLocked) {
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const formatted = user.lockedUntil.toLocaleString('en-US', {
          dateStyle: 'short',
          timeStyle: 'short',
        });
        throw new AppError('forbidden', `Account locked until ${formatted}`);
      }
      throw new AppError('forbidden', 'Account is locked');
    }

    if (user.mustChangePassword)
      throw new AppError('forbidden', 'Password change required before login');
  }

  /**
   * Updates user after successful login.
   */
  async updateLoginSuccess(id: User['id']) {
    await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date(), failedLoginAttempts: 0, isLocked: false, lockedUntil: null },
    });
  }

  /**
   * Updates user after failed login attempt.
   * Returns failedAttempts count and optional lockedUntil.
   */
  async updateLoginFailure(id: User['id']) {
    const updated = await this.prisma.user.update({
      where: { id },
      data: { failedLoginAttempts: { increment: 1 }, lastFailedLoginAt: new Date() },
      select: { failedLoginAttempts: true },
    });

    const failedAttempts = updated.failedLoginAttempts ?? 0;
    let lockedUntil: Date | undefined;

    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
      await this.prisma.user.update({ where: { id }, data: { isLocked: true, lockedUntil } });
    }

    return { failedAttempts, lockedUntil };
  }

  /**
   * Retrieves or creates a normalized first name record.
   */
  async getOrCreateFirstName(firstName: string) {
    const normalized = firstName.trim().toLowerCase();
    let entry = await this.prisma.givenName.findFirst({ where: { firstName: normalized } });
    if (!entry) entry = await this.prisma.givenName.create({ data: { firstName: normalized } });
    return entry;
  }

  /**
   * Retrieves or creates a normalized surname record.
   */
  async getOrCreateSurname(surname: string) {
    const normalized = surname.trim().toLowerCase();
    let entry = await this.prisma.surname.findFirst({ where: { surname: normalized } });
    if (!entry) entry = await this.prisma.surname.create({ data: { surname: normalized } });
    return entry;
  }

  /**
   * Generates a unique login based on first letter of first name + surname.
   * Appends numeric suffix if login already exists.
   */
  async generateUniqueLogin(firstName: string, surname: string) {
    const base = `${firstName[0]?.trim().toLowerCase()}${surname.trim().toLowerCase()}`;
    let login = base;
    let suffix = 1;

    while (await this.prisma.user.findUnique({ where: { login } })) {
      login = `${base}${suffix}`;
      suffix++;
    }
    return login;
  }
}
