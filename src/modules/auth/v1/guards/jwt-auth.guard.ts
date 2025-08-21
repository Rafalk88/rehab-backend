import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtAuthGuard
 *
 * A NestJS guard that automatically validates incoming requests
 * based on a JWT strategy.
 *
 * This guard:
 * - Extracts the JWT from the request (using the configured Passport strategy).
 * - Validates the token and its payload.
 * - Attaches the decoded user payload to `request.user`.
 *
 * Usage:
 * - Apply it at the route or controller level with `@UseGuards(JwtAuthGuard)`.
 * - Requires the `JwtStrategy` to be properly configured and registered.
 *
 * Example:
 * ```ts
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@Request() req) {
 *   return req.user;
 * }
 * ```
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
