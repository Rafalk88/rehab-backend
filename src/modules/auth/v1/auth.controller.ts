import { Controller, Post, Body, Req, UseGuards, SetMetadata, Param } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { AuthorizationGuard } from '@common/guards/authorization.guard.js';
import { AuthService } from './auth.service.js';
import { RegisterUserSchema, LoginUserSchema, RefreshTokenSchema } from './auth.schemas.js';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';

interface JwtRequest extends Request {
  user?: { sub: string };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @SetMetadata('permission', 'register_user')
  @Post('register')
  async register(
    @Body(new ZodValidationPipe(RegisterUserSchema))
    body: RegisterUserSchema,
    @Req() req: JwtRequest,
  ) {
    const adminId = req.user?.sub;
    if (!adminId) return { message: 'No admin logged in' };

    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown';
    return this.authService.registerUser(body, ipAddress);
  }

  @Post('login')
  async login(
    @Body(new ZodValidationPipe(LoginUserSchema))
    body: LoginUserSchema,
    @Req() req: JwtRequest,
  ) {
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown';
    return this.authService.loginUser(body.login, body.password, ipAddress);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: JwtRequest) {
    const userId = req.user?.sub;
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown';
    if (!userId) return { message: 'No user logged in' };

    await this.authService.logoutUser(userId, ipAddress);
    return { message: 'Logged out successfully' };
  }

  @Post('refresh-token')
  async refreshToken(
    @Body(new ZodValidationPipe(RefreshTokenSchema)) body: { refreshToken: string },
  ) {
    const tokens = await this.authService.refreshTokens(body.refreshToken);
    return tokens;
  }

  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @SetMetadata('permission', 'reset_password')
  @Post('admin/reset-password/:userId')
  async adminResetPassword(@Param('userId') userId: string, @Req() req: JwtRequest) {
    const adminId = req.user?.sub;
    if (!adminId) return { message: 'No admin logged in' };

    // Call resetPassword from service
    const temporaryPassword = await this.authService.resetPassword(userId);

    return { temporaryPassword };
  }
}
