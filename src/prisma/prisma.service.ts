import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import logger from '#lib/logger/winston.js';

/**
 * PrismaService
 *
 * A NestJS provider that extends the generated PrismaClient to integrate
 * with the NestJS application lifecycle.
 *
 * Responsibilities:
 * - Establishes a connection to the database when the module is initialized.
 * - Gracefully disconnects from the database when the application shuts down.
 *
 * By extending `PrismaClient`, this service allows injecting Prisma into
 * any other service or controller using Nest's dependency injection system.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
