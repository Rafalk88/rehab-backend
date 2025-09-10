import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: { firstName: string; surname: string; password: string }) {
    return this.authService.registerUser(body);
  }

  @Post('login')
  async login(@Body() body: { login: string; password: string }) {
    return this.authService.loginUser(body.login, body.password);
  }
}
