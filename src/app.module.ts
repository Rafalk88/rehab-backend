import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module.js';
import { CacheModule } from '@nestjs/cache-manager';
import { LoggerModule } from '@lib/logger/logger.module.js';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
