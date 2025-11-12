import { AuthHelpers } from './helpers/auth.helpers.js';
import { RequestContextService } from '#context/request-context.service.js';
import { AppError } from '#common/errors/app.error.js';
import { Prisma } from '#/generated/prisma/client.js';
import { DbLoggerService } from '#lib/DbLoggerService.js';
import { computeHmac, aesGcmEncrypt, maskString } from '#/lib/encryption.util.js';
import { hashPassword, verifyPassword } from '#lib/password.util.js';
import { PrismaService } from '#prisma/prisma.service.js';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;
const CURRENT_KEY_VERSION = 1;

/**
 * AuthService
 *
 * Provides authentication and user registration logic.
 *
 * Responsibilities:
 * - Registering new users in the system (with unique login, email, and hashed password),
 * - Validating login credentials and account restrictions,
 * - Generating signed JWT tokens for authenticated users.
 *
 * This service integrates:
 * - `PrismaService` for database access,
 * - `JwtService` from NestJS for token signing,
 * - Custom utilities and helpers for password hashing, login generation,
 *   and account validation.
 *
 * Example usage:
 * ```ts
 * const { user, login } = await authService.registerUser({
 *   firstName: 'Alice',
 *   surname: 'Smith',
 *   password: 'Secret123',
 * });
 *
 * const token = await authService.loginUser('asmith', 'Secret123');
 * // { access_token: 'eyJhbGciOiJIUzI1NiIsInR...' }
 * ```
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly helpers: AuthHelpers,
    private readonly dbLogger: DbLoggerService,
    private readonly requestContext: RequestContextService,
  ) {}

  /**
   * Registers a new user in the system.
   *
   * This method:
   * - Ensures first name and surname records exist (creates them if needed),
   * - Generates a unique login and derives an email address,
   * - Hashes the provided password,
   * - Creates a new user record in the database with `mustChangePassword = true`.
   *
   * @param userData - Object containing user's first name, surname, password,
   *   and optional `sexId` and `organizationalUnitId`.
   * @returns Object containing the newly created user and their generated login.
   *
   * Example:
   * ```ts
   * const { user, login } = await authService.registerUser({
   *   firstName: 'John',
   *   surname: 'Doe',
   *   password: 'P@ssw0rd123',
   * });
   * // user: { id: 'abc123', login: 'jdoe', email: 'jdoe@vitala.com', ... }
   * // login: 'jdoe'
   * ```
   */
  async registerUser(userData: {
    firstName: string;
    surname: string;
    sexId?: string;
    organizationalUnitId?: string;
    password: string;
  }) {
    const { firstName, surname, sexId, organizationalUnitId, password } = userData;

    // 1️⃣ Create / get first name and surname
    const firstNameEntry = await this.helpers.getOrCreateFirstName(firstName);
    const surnameEntry = await this.helpers.getOrCreateSurname(surname);

    // 2️⃣ Generate login, email, password
    const login = await this.helpers.generateUniqueLogin(firstName, surname);
    const loginHmac = computeHmac(login, CURRENT_KEY_VERSION);
    const loginEncrypted = aesGcmEncrypt(login, CURRENT_KEY_VERSION);
    const loginMasked = maskString(login);

    const emailHmac = computeHmac(`${login}@vitala.com`, CURRENT_KEY_VERSION);
    const emailEncrypted = aesGcmEncrypt(`${login}@vitala.com`, CURRENT_KEY_VERSION);
    const emailMasked = maskString(`${login}@vitala.com`);

    const passwordHash = await hashPassword(password);

    const newValues = {
      loginHmac,
      loginEncrypted,
      loginMasked,
      emailHmac,
      emailEncrypted,
      emailMasked,
      passwordHash,
      keyVersion: CURRENT_KEY_VERSION,
      firstNameId: firstNameEntry.id,
      surnameId: surnameEntry.id,
      sexId: sexId ?? null,
      organizationalUnitId: organizationalUnitId ?? null,
      mustChangePassword: true,
    };

    // 3️⃣ Create user in DB
    const user = await this.requestContext.withAudit(
      {
        actionDetails: `User "${loginMasked}" successfully registered`,
        newValues,
      },
      () =>
        this.prisma.user.create({
          data: newValues,
        }),
    );

    // 6️⃣ Return user + tokens
    return {
      user,
      login,
    };
  }

  /**
   * Refreshes access and refresh tokens for a user.
   *
   * This method:
   * - Verifies the provided refresh token against stored hashed tokens in the database.
   * - Rejects the request if the token is invalid, expired, or blacklisted.
   * - Moves the old refresh token to the BlacklistedToken table for audit and security.
   * - Deletes the old refresh token from the refreshToken table.
   * - Generates a new access token (short-lived) and a new refresh token (long-lived).
   * - Hashes the new refresh token and stores it in the refreshToken table with an expiration date.
   *
   * @param providedToken - The refresh token provided by the client.
   * @returns An object containing:
   *   - `access_token`: newly signed JWT access token.
   *   - `refresh_token`: newly generated refresh token.
   *
   * @throws AppError with type 'unauthorized' if the token is invalid, expired, or blacklisted.
   *
   * @example
   * const tokens = await authService.refreshTokens(existingRefreshToken);
   * // {
   * //   access_token: 'eyJhbGciOiJIUzI1NiIsInR...',
   * //   refresh_token: 'eyJhbGciOiJIUzI1NiIsInR...'
   * // }
   */
  async refreshTokens(providedToken: string) {
    // 1️⃣ Find all non-expired tokens
    const tokens = await this.prisma.refreshToken.findMany({
      where: { expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    // 2️⃣ Find matching token
    let tokenEntry: (typeof tokens)[number] | null = null;
    for (const t of tokens) {
      const isValid = await verifyPassword(providedToken, t.tokenHash);
      if (isValid) {
        tokenEntry = t;
        break;
      }
    }

    if (!tokenEntry) {
      throw new AppError('unauthorized', 'Refresh token expired or invalid');
    }

    const user = tokenEntry.user;

    // 3️⃣ Check if token is already blacklisted
    const blacklisted = await this.prisma.blacklistedToken.findUnique({
      where: { jti: tokenEntry.id },
    });

    if (blacklisted) {
      throw new AppError('unauthorized', 'Refresh token has been revoked');
    }

    // 4️⃣ Generate new access token
    const payload = { sub: user.id, email_masked: user.emailMasked };
    const newAccessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    // 5️⃣ Generate new refresh token, hash it
    const newRefreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    const newTokenHash = await hashPassword(newRefreshToken);

    // 6️⃣ Move old refresh token to Blacklist instead of deleting
    await this.prisma.blacklistedToken.create({
      data: {
        jti: tokenEntry.id,
        userId: user.id,
        expiredAt: tokenEntry.expiresAt,
      },
    });

    // 7️⃣ Clear old refresh token
    await this.prisma.refreshToken.delete({ where: { id: tokenEntry.id } });

    // 8️⃣ Save new refresh token
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newTokenHash,
        expiresAt: new Date(Date.now() + SEVEN_DAYS_IN_MS),
      },
    });

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    };
  }

  /**
   * Authenticates a user by verifying login credentials and account restrictions,
   * then generates JWT access and refresh tokens.
   *
   * This method:
   * - Finds the user by login,
   * - Verifies the provided password against the stored hash,
   * - Checks account restrictions (active, locked, mustChangePassword, etc.),
   * - Resets failed login attempts on success,
   * - Generates a signed JWT access token (short-lived),
   * - Generates a signed JWT refresh token (long-lived) and stores its hash in DB.
   *
   * @param login - The user's login string.
   * @param password - The plain-text password to validate.
   * @returns Object containing a signed JWT access token and refresh token.
   *
   * @throws UnauthorizedException if the login or password is invalid,
   *   or if the account is locked/inactive.
   *
   * Example:
   * ```ts
   * const tokens = await authService.loginUser('jdoe', 'P@ssw0rd123');
   * // {
   * //   access_token: 'eyJhbGciOiJIUzI1NiIsInR...',
   * //   refresh_token: 'eyJhbGciOiJIUzI1NiIsInR...'
   * // }
   * ```
   */
  async loginUser(login: string, password: string) {
    const context = this.requestContext.get();
    const ipAddress = context?.ipAddress ?? 'system';

    const loginHmac = computeHmac(login, CURRENT_KEY_VERSION);

    const retentionUntil = new Date();
    retentionUntil.setFullYear(retentionUntil.getFullYear() + 5);

    const user = await this.prisma.user.findUnique({ where: { loginHmac } });
    if (!user) {
      const maskedLogin = maskString(login);
      const encryptedLogin = aesGcmEncrypt(login, CURRENT_KEY_VERSION);

      await this.dbLogger.logAction({
        userId: null,
        action: 'login_failed',
        actionDetails: `Failed login attempt for ${maskedLogin}`,
        oldValues: Prisma.DbNull,
        newValues: { encryptedLogin },
        entityType: 'User',
        entityId: 'unknown',
        retentionUntil,
        ipAddress,
      });
      throw new AppError('unauthorized', 'Invalid login or password');
    }

    await this.helpers.verifyLoginCredentials(
      {
        id: user.id,
        failedLoginAttempts: user.failedLoginAttempts,
        passwordHash: user.passwordHash,
        isLocked: user.isLocked,
        lockedUntil: user.lockedUntil,
        lastFailedLoginAt: user.lastFailedLoginAt,
        loginMasked: user.loginMasked,
      },
      password,
    );

    this.helpers.checkLoginRestrictions({
      isActive: user.isActive,
      isLocked: user.isLocked,
      lockedUntil: user.lockedUntil,
      mustChangePassword: user.mustChangePassword,
    });

    await this.helpers.updateLoginSuccess(user);

    const payload = { sub: user.id, email_masked: user.emailMasked };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    const hashedRefreshToken = await hashPassword(refreshToken);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashedRefreshToken,
        expiresAt: new Date(Date.now() + SEVEN_DAYS_IN_MS),
      },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  /**
   * Logs out a user by invalidating the provided refresh token.
   *
   * This method:
   * - Finds the provided refresh token in the database,
   * - Verifies it and ensures it is not expired,
   * - Moves the token to the BlacklistedToken table for future checks,
   * - Deletes the original refresh token from the DB,
   * - Logs the logout action for auditing purposes.
   *
   * @param refreshToken - The refresh token provided by the client for logout.
   * @param ipAddress - Optional IP address from which the logout is performed.
   * @returns Confirmation message.
   *
   * @example
   * const result = await authService.logoutUser(refreshToken, '192.168.1.1');
   * // { message: 'Successfully logged out' }
   *
   * @throws UnauthorizedException if the token is already invalid or expired.
   */
  async logoutUser() {
    const context = this.requestContext.get();
    const userId = context?.userId;
    const ipAddress = context?.ipAddress ?? 'system';

    const retentionUntil = new Date();
    retentionUntil.setFullYear(retentionUntil.getFullYear() + 5);

    if (!userId) {
      throw new AppError('unauthorized', 'User must be logged in to logout');
    }

    // 1️⃣ Find the refresh token entry in DB
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
    });

    if (!tokens.length) {
      throw new AppError('unauthorized', 'No active tokens found');
    }

    await this.prisma.blacklistedToken.createMany({
      data: tokens.map((t) => ({
        jti: t.id,
        userId,
        expiredAt: t.expiresAt,
      })),
    });

    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    await this.dbLogger.logAction({
      userId,
      action: 'logout',
      actionDetails: 'User logged out successfully',
      oldValues: Prisma.DbNull,
      newValues: Prisma.DbNull,
      entityType: 'User',
      entityId: userId,
      retentionUntil,
      ipAddress,
    });

    return { message: 'Successfully logged out' };
  }

  /**
   * Changes the user's password.
   *
   * This method:
   * - Verifies that the old password matches the current one,
   * - Checks that the new password matches the confirmation password,
   * - Ensures the new password has not been used in the last 5 password changes,
   * - Hashes the new password and updates it in the user's record,
   * - Adds the new password to the password history,
   * - Removes the oldest password from history if there are more than 5 entries,
   * - Logs the password change action.
   *
   * @param userId - ID of the user changing the password.
   * @param oldPassword - Current password of the user.
   * @param newPassword - New password to set.
   * @param confirmNewPassword - Confirmation of the new password.
   * @param ipAddress - Optional IP address from which the change is performed.
   * @returns An object with a success message.
   *
   * @throws AppError if validation fails (password mismatch, reuse, or incorrect old password).
   *
   * @example
   * const result = await authService.changePassword(
   *   userId,
   *   'OldPass123!',
   *   'NewPass456!',
   *   'NewPass456!',
   *   '192.168.1.1'
   * );
   * // { message: 'Password changed successfully' }
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
    confirmNewPassword: string,
  ) {
    // 1️⃣ Validate new passwords match
    if (newPassword !== confirmNewPassword) {
      throw new AppError('validation', 'New passwords do not match');
    }

    // 2️⃣ Retrieve the user
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('not_found', 'User not found');

    // 3️⃣ Verify old password
    const isOldPasswordValid = await verifyPassword(oldPassword, user.passwordHash);
    if (!isOldPasswordValid) {
      throw new AppError('unauthorized', 'Old password is incorrect');
    }

    // 4️⃣ Check last 5 passwords to prevent reuse
    const lastPasswords = await this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { changedAt: 'desc' },
      take: 5,
    });

    for (const p of lastPasswords) {
      const isUsedBefore = await verifyPassword(newPassword, p.passwordHash);
      if (isUsedBefore) {
        throw new AppError('validation', 'You cannot reuse a recent password');
      }
    }

    // 5️⃣ Hash new password and update user
    const newPasswordHash = await hashPassword(newPassword);
    await this.requestContext.withAudit(
      {
        actionDetails: `User ${user.loginMasked} changed password`,
        oldValues: { mustChangePassword: true },
        newValues: { mustChangePassword: false },
      },
      () =>
        this.prisma.user.update({
          where: { id: userId },
          data: { passwordHash: newPasswordHash, mustChangePassword: false },
        }),
    );

    // 6️⃣ Save new password to history
    await this.prisma.passwordHistory.create({
      data: {
        userId,
        passwordHash: newPasswordHash,
        changedById: userId,
      },
    });

    // 7️⃣ Limit history to last 5 passwords
    if (lastPasswords.length >= 5) {
      const oldest = lastPasswords[lastPasswords.length - 1];
      if (oldest) {
        await this.prisma.passwordHistory.delete({ where: { id: oldest.id } });
      }
    }

    return { message: 'Password changed successfully' };
  }

  /**
   * Resets a user's password for one-time use.
   *
   * This method:
   * - Generates a strong temporary password automatically,
   * - Hashes it and updates the user's record in the database,
   * - Sets `mustChangePassword` to true to force the user to change it on next login,
   * - Logs the action using `DbLoggerService` with abstracted old/new values (without exposing actual password),
   * - Returns the temporary password so the admin can give it to the user.
   *
   * @param userId - The ID of the user whose password is being reset.
   * @param adminId - Optional ID of the admin performing the reset (defaults to 'system').
   * @param adminIp - Optional IP address of the admin performing the reset.
   * @returns The newly generated temporary password.
   *
   * @throws AppError with type 'not_found' if the user does not exist.
   *
   * @example
   * const tempPassword = await authService.resetPassword('user-123', 'admin-456', '192.168.1.1');
   * // tempPassword: 'Abc123!@#Example'
   */
  async resetPassword(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('not_found', 'User not found');

    // Generate a temporary password
    const tempPassword = this.generateStrongPassword();

    // Hash the password
    const passwordHash = await hashPassword(tempPassword);

    // Update user with new password and require change on next login
    await this.requestContext.withAudit(
      {
        actionDetails: `Password changed for user ${user.loginMasked}`,
        oldValues: { mustChangePassword: true },
        newValues: { mustChangePassword: false },
      },
      () =>
        this.prisma.user.update({
          where: { id: user.id },
          data: {
            passwordHash,
            mustChangePassword: true,
          },
        }),
    );

    return tempPassword;
  }

  /**
   * Generates a strong random password satisfying security requirements:
   * - At least 12 characters,
   * - At least 1 uppercase letter,
   * - At least 1 number,
   * - At least 1 special character.
   */
  private generateStrongPassword(): string {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const special = '!@#$%^&*()-_=+[]{}|;:,.<>?';

    const all = upper + lower + digits + special;

    // Ensure password contains at least one from each category
    const password = [
      upper[Math.floor(Math.random() * upper.length)],
      digits[Math.floor(Math.random() * digits.length)],
      special[Math.floor(Math.random() * special.length)],
    ];

    // Fill remaining characters randomly to reach at least 12
    while (password.length < 12) {
      password.push(all[Math.floor(Math.random() * all.length)]);
    }

    // Shuffle array
    for (let i = password.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [password[i], password[j]] = [password[j], password[i]];
    }

    return password.join('');
  }

  /**
   * Locks a user account for a specified duration or permanently.
   *
   * This method:
   * - Sets the user's `isLocked` flag to true,
   * - Sets `lockedUntil` to a future date based on duration in minutes,
   *   or to a permanent date (`9999-12-31`) if duration is undefined,
   * - Logs the action using `DbLoggerService`, including the admin ID, IP address,
   *   and an optional reason for the block.
   *
   * @param userId - ID of the user to be blocked.
   * @param adminId - ID of the admin performing the block.
   * @param adminIp - IP address of the admin performing the block.
   * @param durationInMinutes - Optional duration of the block in minutes; if omitted, the block is permanent.
   * @param reason - Optional reason for blocking the user, stored in actionDetails.
   *
   * @returns An object containing:
   *   - `message`: confirmation message,
   *   - `lockedUntil`: the date until which the user is blocked,
   *   - `reason`: the provided reason or 'Not specified'.
   *
   * @throws AppError with type 'not_found' if the user does not exist.
   *
   * @example
   * await authService.blockUser('user-123', 'admin-456', '192.168.1.1', 60, 'Violation of rules');
   * // { message: 'User blocked successfully', blockedUntil: Date, reason: 'Violation of rules' }
   */
  async lockUser(userId: string, durationInMinutes?: number, reason?: string) {
    // 1️⃣ Find user
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('not_found', 'User not found');

    const oldValues = { isLocked: user.isLocked, lockedUntil: user.lockedUntil };

    // 2️⃣ Set block
    const lockedUntil = durationInMinutes
      ? new Date(Date.now() + durationInMinutes * 60 * 1000)
      : new Date('9999-12-31T23:59:59Z'); // permanent block

    const newValues = { isLocked: true, lockedUntil };

    const updatedUser = await this.requestContext.withAudit(
      {
        actionDetails: `User ${user.loginMasked} blocked successfully`,
        oldValues: oldValues,
        newValues: newValues,
      },
      () =>
        this.prisma.user.update({
          where: { id: userId },
          data: newValues,
        }),
    );

    return {
      message: 'User blocked successfully',
      lockedUntil: updatedUser.lockedUntil,
      reason: reason ?? 'Not specified',
    };
  }
}
