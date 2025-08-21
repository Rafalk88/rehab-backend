import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/**
 * JwtStrategy
 *
 * Passport.js strategy integrated with NestJS to validate JWT tokens.
 *
 * How it works:
 * - Extracts the JWT from the `Authorization` header (`Bearer <token>`).
 * - Verifies the token's signature using `JWT_SECRET` (fallback: "secretForJWT").
 * - Rejects the request if the token is expired or invalid.
 * - On success, attaches the decoded payload to `request.user`.
 *
 * Typical payload structure:
 * ```json
 * {
 *   "sub": "user-123",
 *   "email": "john.doe@example.com",
 *   "iat": 1690000000,
 *   "exp": 1690003600
 * }
 * ```
 *
 * The `validate()` method decides what will be returned and available
 * as `request.user` in controllers/guards.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'secretForJWT',
    });
  }

  /**
   * Called automatically after JWT verification.
   *
   * @param payload - Decoded JWT payload (content of the token).
   * @returns Object injected into `request.user`.
   *
   * Example:
   * ```ts
   * // token payload:
   * { sub: 'user-123', email: 'john@example.com' }
   *
   * // result of validate():
   * { userId: 'user-123', email: 'john@example.com' }
   * ```
   */
  async validate(payload: any) {
    return { userId: payload.sub, email: payload.email };
  }
}
