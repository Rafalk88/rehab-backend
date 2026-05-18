import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthHelpers } from './helpers/auth.helpers.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { RequestContextModule } from '#context/request-context.module.js';
import { PermissionsModule } from '#modules/permissions/permissions.module.js';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretForJWT',
      signOptions: { expiresIn: '15m' },
    }),
    PermissionsModule,
    RequestContextModule,
  ],
  providers: [AuthService, JwtStrategy, AuthHelpers],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
