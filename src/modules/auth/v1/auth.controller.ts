import { Controller, Post, Body, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import { RegisterUserSchema, LoginUserSchema } from './auth.schemas.js';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body(new ZodValidationPipe(RegisterUserSchema))
    body: RegisterUserSchema,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown';
    return this.authService.registerUser(body, ipAddress);
  }

  @Post('login')
  async login(
    @Body(new ZodValidationPipe(LoginUserSchema))
    body: LoginUserSchema,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown';
    return this.authService.loginUser(body.login, body.password, ipAddress);
  }

  @Post('logout')
  async logout(@Req() req: Request) {
    const userId = req.session?.userId || null;
    if (!userId) return { message: 'No user logged in' };

    await this.authService.logoutUser(userId);
    return { message: 'Logged out successfully' };
  }
}
