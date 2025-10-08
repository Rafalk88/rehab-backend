import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from '#prisma/prisma.module.js';
import { LoggerModule } from '#lib/logger/logger.module.js';
import { AuthModule } from '#modules/auth/v1/auth.module.js';
import { PermissionsModule } from '#modules/permissions/permissions.module.js';
import { PermissionsAdminModule } from '#modules/permissions-admin/permissions-admin.module.js';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    // Env config
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Prisma
    PrismaModule,

    // Cache (global)
    CacheModule.register({
      ttl: 60_000, // 1 min default TTL
      max: 1000, // max items
      isGlobal: true,
    }),

    // Custom app logger (winston)
    LoggerModule,

    // Auth
    AuthModule,

    // Permissions
    PermissionsModule,
    PermissionsAdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
