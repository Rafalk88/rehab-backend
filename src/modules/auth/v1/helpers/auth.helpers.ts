import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { AppError } from '@common/errors/app.error.js';
import { verifyPassword } from '@lib/password.util.js';
import type { User } from '@prisma/client';

/**
 * Constants for authentication and lockout policies.
 */
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

/**
 * AuthHelpers
 *
 * Provides reusable helper methods for authentication logic.
 *
 * Responsibilities:
 * - Verifying passwords and login credentials,
 * - Handling failed login attempts (incrementing counters, locking accounts),
 * - Checking user restrictions (locked, inactive, must-change-password),
 * - Generating unique logins and managing name records.
 *
 * Used by:
 * - `AuthService` (for register, login, reset password, etc.)
 *
 * Example:
 * ```ts
 * const helpers = new AuthHelpers(prisma);
 * await helpers.verifyLoginCredentials(user, 'Secret123!');
 * helpers.checkLoginRestrictions(user);
 * await helpers.updateLoginSuccess(user.id);
 * ```
 */
@Injectable()
export class AuthHelpers {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verifies if the provided password matches the stored password hash.
   * Updates failed attempts or locks account if needed.
   *
   * @param user - User object containing id, failedLoginAttempts, and passwordHash.
   * @param password - Plain text password to check.
   * @throws {AppError} 'unauthorized' or 'forbidden' if credentials are invalid or locked.
   */
  async verifyLoginCredentials(
    user: Pick<User, 'id' | 'failedLoginAttempts' | 'passwordHash'>,
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
   * Checks various account restrictions before allowing login.
   * Throws an error if any restriction is violated.
   *
   * @param user - Partial User with relevant restriction fields.
   * @throws {AppError} 'forbidden' if user is inactive, locked, or must change password.
   */
  checkLoginRestrictions(
    user: Pick<User, 'isActive' | 'isLocked' | 'lockedUntil' | 'mustChangePassword'>,
  ) {
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

    if (user.mustChangePassword) {
      throw new AppError('forbidden', 'Password change required before login');
    }
  }

  /**
   * Resets failed login attempts and updates last login timestamp.
   *
   * @param id - User ID to update.
   */
  async updateLoginSuccess(id: User['id']) {
    await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date(), failedLoginAttempts: 0, isLocked: false, lockedUntil: null },
    });
  }

  /**
   * Increments failed login attempts and locks account if threshold reached.
   *
   * @param id - User ID to update.
   * @returns Object with `failedAttempts` and optional `lockedUntil`.
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
   * Example: "Alice" → { id: 'uuid', firstName: 'alice' }
   */
  async getOrCreateFirstName(firstName: string) {
    const normalized = firstName.trim().toLowerCase();
    let entry = await this.prisma.givenName.findFirst({ where: { firstName: normalized } });
    if (!entry) entry = await this.prisma.givenName.create({ data: { firstName: normalized } });
    return entry;
  }

  /**
   * Retrieves or creates a normalized surname record.
   * Example: "Smith" → { id: 'uuid', surname: 'smith' }
   */
  async getOrCreateSurname(surname: string) {
    const normalized = surname.trim().toLowerCase();
    let entry = await this.prisma.surname.findFirst({ where: { surname: normalized } });
    if (!entry) entry = await this.prisma.surname.create({ data: { surname: normalized } });
    return entry;
  }

  /**
   * Generates a unique login (e.g., "asmith", "asmith1", "asmith2"…).
   *
   * @param firstName - User's first name.
   * @param surname - User's surname.
   * @returns Unique login string.
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
