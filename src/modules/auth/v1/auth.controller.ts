import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterUserSchema, LoginUserSchema } from './auth.schemas.js';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body(new ZodValidationPipe(RegisterUserSchema))
    body: RegisterUserSchema,
  ) {
    return this.authService.registerUser(body);
  }

  @Post('login')
  async login(
    @Body(new ZodValidationPipe(LoginUserSchema))
    body: LoginUserSchema,
  ) {
    return this.authService.loginUser(body.login, body.password);
  }
}
