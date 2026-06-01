import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { RequestContextModule } from '#context/request-context.module.js';
import { PrismaSessionMiddleware } from '#prisma/middleware/prisma-session.js';
import { PrismaModule } from '#prisma/prisma.module.js';
import { LoggerModule } from '#lib/logger/logger.module.js';
import { AuthModule } from '#modules/auth/v1/auth.module.js';
import { HealthModule } from './health/health.module.js';
import { OrganizationalUnitsModule } from '#modules/organizational-units/organizational-units.module.js';
import { PatientsModule } from '#modules/patients/patients.module.js';
import { PermissionsModule } from '#modules/permissions/permissions.module.js';
import { PermissionsAdminModule } from '#modules/permissions-admin/permissions-admin.module.js';
import { VisitsModule } from '#modules/visits/visits.module.js';
import { CacheModule } from '@nestjs/cache-manager';
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

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

    //health checks
    HealthModule,

    // Permissions
    PermissionsModule,
    PermissionsAdminModule,

    // Middleware
    RequestContextModule,

    // Patients
    PatientsModule,

    // Visits
    VisitsModule,

    // Organizational Units
    OrganizationalUnitsModule,
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
