import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { AuthService } from './auth.service.js';
import { RegisterUserSchema, LoginUserSchema } from './auth.schemas.js';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';

interface JwtRequest extends Request {
  user?: { sub: string };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body(new ZodValidationPipe(RegisterUserSchema))
    body: RegisterUserSchema,
    @Req() req: JwtRequest,
  ) {
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
}
