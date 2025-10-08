import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthHelpers } from './helpers/auth.helpers.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { DbLoggerModule } from '#lib/DbLoggerService.module.js';
import { PermissionsModule } from '#modules/permissions/permissions.module.js';
import { PrismaService } from '#prisma/prisma.service.js';
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
    DbLoggerModule,
    PermissionsModule,
  ],
  providers: [AuthService, JwtStrategy, PrismaService, AuthHelpers],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
