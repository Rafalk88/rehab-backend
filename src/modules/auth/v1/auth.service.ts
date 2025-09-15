import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/prisma/prisma.service.js';
import { hashPassword, verifyPassword } from '@lib/password.util.js';
import { AuthHelpers } from './helpers/auth.helpers.js';
import { DbLoggerService } from '@lib/DbLoggerService.js';
import { AppError } from '@common/errors/app.error.js';

const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

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
  async registerUser(
    userData: {
      firstName: string;
      surname: string;
      sexId?: string;
      organizationalUnitId?: string;
      password: string;
    },
    ipAddress?: string,
  ) {
    const { firstName, surname, sexId, organizationalUnitId, password } = userData;

    // 1️⃣ Create / get first name and surname
    const firstNameEntry = await this.helpers.getOrCreateFirstName(firstName);
    const surnameEntry = await this.helpers.getOrCreateSurname(surname);

    // 2️⃣ Generate login, email, password hash
    const login = await this.helpers.generateUniqueLogin(firstName, surname);
    const email = `${login}@vitala.com`;
    const passwordHash = await hashPassword(password);

    // 3️⃣ Create user in DB
    const user = await this.prisma.user.create({
      data: {
        login,
        email,
        passwordHash,
        firstNameId: firstNameEntry.id,
        surnameId: surnameEntry.id,
        sexId: sexId ?? null,
        organizationalUnitId: organizationalUnitId ?? null,
        mustChangePassword: true,
      },
    });

    // 4️⃣ Log registration
    await this.dbLogger.logAction({
      userId: user.id,
      action: 'register',
      actionDetails: `User registered with login ${login}`,
      entityType: 'User',
      entityId: user.id,
      ipAddress: ipAddress ?? 'system',
    });

    // 5️⃣ Generate tokens
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    const hashedRefreshToken = await hashPassword(refreshToken);

    // 6️⃣ Save refresh token in DB
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashedRefreshToken,
        expiresAt: new Date(Date.now() + SEVEN_DAYS_IN_MS),
      },
    });

    // 7️⃣ Return user + tokens
    return {
      user,
      login,
      access_token: accessToken,
      refresh_token: refreshToken,
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
    const payload = { sub: user.id, email: user.email };
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
   * Authenticates a user by verifying login credentials and account restrictions.
   *
   * This method:
   * - Finds the user by login,
   * - Verifies the provided password against the stored hash,
   * - Checks account restrictions (active, locked, mustChangePassword, etc.),
   * - Resets failed login attempts on success,
   * - Generates and returns a signed JWT access token.
   *
   * @param login - The user's login string.
   * @param password - The plain-text password to validate.
   * @returns Object containing a signed JWT access token.
   *
   * @throws UnauthorizedException if the login or password is invalid,
   *   or if the account is locked/inactive.
   *
   * Example:
   * ```ts
   * const token = await authService.loginUser('jdoe', 'P@ssw0rd123');
   * // {
   * //   access_token: 'eyJhbGciOiJIUzI1NiIsInR...'
   * // }
   * ```
   */
  async loginUser(login: string, password: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({ where: { login } });
    if (!user) {
      await this.dbLogger.logAction({
        userId: 'unknown',
        action: 'login_failed',
        actionDetails: `Failed login attempt for ${login}`,
        entityType: 'User',
        entityId: 'unknown',
        ipAddress: ipAddress ?? 'system',
      });
      throw new AppError('unauthorized', 'Invalid login or password');
    }

    await this.helpers.verifyLoginCredentials(
      {
        id: user.id,
        failedLoginAttempts: user.failedLoginAttempts,
        passwordHash: user.passwordHash,
      },
      password,
    );

    this.helpers.checkLoginRestrictions({
      isActive: user.isActive,
      isLocked: user.isLocked,
      lockedUntil: user.lockedUntil,
      mustChangePassword: user.mustChangePassword,
    });

    await this.helpers.updateLoginSuccess(user.id);

    await this.dbLogger.logAction({
      userId: user.id,
      action: 'login',
      actionDetails: `User logged in successfully`,
      entityType: 'User',
      entityId: user.id,
      ipAddress: ipAddress ?? 'system',
    });

    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
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
  async logoutUser(refreshToken: string, ipAddress?: string) {
    // 1️⃣ Find the refresh token entry in DB
    const tokens = await this.prisma.refreshToken.findMany({
      where: { expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    let tokenEntry: (typeof tokens)[number] | null = null;
    for (const t of tokens) {
      if (await verifyPassword(refreshToken, t.tokenHash)) {
        tokenEntry = t;
        break;
      }
    }

    if (!tokenEntry) {
      throw new AppError('unauthorized', 'Token already invalidated or expired');
    }

    const user = tokenEntry.user;

    // 2️⃣ Add token to Blacklist
    await this.prisma.blacklistedToken.create({
      data: {
        jti: tokenEntry.id,
        userId: user.id,
        expiredAt: tokenEntry.expiresAt,
      },
    });

    // 3️⃣ Delete original refresh token
    await this.prisma.refreshToken.delete({ where: { id: tokenEntry.id } });

    // 4️⃣ Log the logout action
    await this.dbLogger.logAction({
      userId: user.id,
      action: 'logout',
      actionDetails: `User ${user.login} logged out`,
      entityType: 'User',
      entityId: user.id,
      ipAddress: ipAddress ?? 'system',
    });

    return { message: 'Successfully logged out' };
  }
}
