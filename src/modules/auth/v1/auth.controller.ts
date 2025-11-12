import { AuthService } from './auth.service.js';
import {
  RegisterUserSchema,
  LoginUserSchema,
  RefreshTokenSchema,
  ChangePasswordSchema,
  LockUserSchema,
} from './auth.schemas.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { AuthorizationGuard } from '#common/guards/authorization.guard.js';
import { ZodValidationPipe } from '#common/pipes/zod-validation.pipe.js';
import { Permissions } from '#modules/permissions/decorators/permission.decorator.js';
import { Controller, Post, Body, Req, UseGuards, Param } from '@nestjs/common';
import type { Request } from 'express';

interface JwtRequest extends Request {
  user?: { sub: string };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @Permissions('register.user')
  @Post('register')
  async register(
    @Body(new ZodValidationPipe(RegisterUserSchema))
    body: RegisterUserSchema,
    @Req() req: JwtRequest,
  ) {
    const adminId = req.user?.sub;
    if (!adminId) return { message: 'No admin logged in' };

    return this.authService.registerUser(body);
  }

  @Post('login')
  async login(
    @Body(new ZodValidationPipe(LoginUserSchema))
    body: LoginUserSchema,
    @Req() req: JwtRequest,
  ) {
    return this.authService.loginUser(body.login, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: JwtRequest) {
    const userId = req.user?.sub;

    if (!userId) return { message: 'No user logged in' };

    await this.authService.logoutUser();
    return { message: 'Logged out successfully' };
  }

  @Post('refresh-token')
  async refreshToken(
    @Body(new ZodValidationPipe(RefreshTokenSchema)) body: { refreshToken: string },
  ) {
    const tokens = await this.authService.refreshTokens(body.refreshToken);
    return tokens;
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Body(new ZodValidationPipe(ChangePasswordSchema))
    body: ChangePasswordSchema,
    @Req() req: JwtRequest,
  ) {
    const userId = req.user?.sub;
    if (!userId) return { message: 'No user logged in' };

    return this.authService.changePassword(
      userId,
      body.oldPassword,
      body.newPassword,
      body.confirmNewPassword,
    );
  }

  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @Permissions('reset.password')
  @Post('reset-password/:userId')
  async adminResetPassword(@Param('userId') userId: string, @Req() req: JwtRequest) {
    const adminId = req.user?.sub;
    if (!adminId) return { message: 'No admin logged in' };

    const tempPassword = await this.authService.resetPassword(userId);

    return { tempPassword };
  }

  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @Permissions('lock.user')
  @Post('lock-user/:userId')
  async lockUser(
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(LockUserSchema))
    body: { durationInMinutes?: number; reason?: string },
    @Req() req: JwtRequest,
  ) {
    const adminId = req.user?.sub;
    if (!adminId) return { message: 'No admin logged in' };

    return this.authService.lockUser(userId, body.durationInMinutes, body.reason);
  }
}
