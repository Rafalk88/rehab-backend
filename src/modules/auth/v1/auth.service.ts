import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/prisma/prisma.service.js';
import { hashPassword } from '@lib/password.util.js';
import { AuthHelpers } from './helpers/auth.helpers.js';

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

    const firstNameEntry = await this.helpers.getOrCreateFirstName(firstName);
    const surnameEntry = await this.helpers.getOrCreateSurname(surname);
    const login = await this.helpers.generateUniqueLogin(firstName, surname);
    const email = `${login}@vitala.com`;
    const passwordHash = await hashPassword(password);

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

    return { user, login };
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
  async loginUser(login: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { login } });
    if (!user) {
      throw new UnauthorizedException('Invalid login or password');
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

    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
