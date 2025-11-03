import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { RequestContextModule } from '#context/request-context.module.js';
import { PrismaSessionMiddleware } from '#prisma/middleware/prisma-session.js';
import { PrismaModule } from '#prisma/prisma.module.js';
import { LoggerModule } from '#lib/logger/logger.module.js';
import { AuthModule } from '#modules/auth/v1/auth.module.js';
import { PermissionsModule } from '#modules/permissions/permissions.module.js';
import { PermissionsAdminModule } from '#modules/permissions-admin/permissions-admin.module.js';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';

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

    // Middleware
    RequestContextModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    /**
     * Apply PrismaSessionMiddleware to all routes.
     * This automatically sets the Prisma session context
     * (user ID and IP address) for every incoming request.
     */
    consumer.apply(PrismaSessionMiddleware).forRoutes('*');
  }
}
