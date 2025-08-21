import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * AuthService
 *
 * Provides authentication-related logic, such as generating JWT tokens.
 * Uses NestJS `JwtService` under the hood.
 */
@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Generates a signed JWT access token for the given user.
   *
   * @param user - User object containing at least `id` and `email`.
   * @returns Object with an `access_token` string.
   *
   * Example:
   * ```ts
   * const token = await authService.login({ id: '123', email: 'john@example.com' });
   * // {
   * //   access_token: 'eyJhbGciOiJIUzI1NiIsInR...'
   * // }
   * ```
   */
  async login(user: { id: string; email: string }) {
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
