import { PrismaService } from './prisma.service.js';
import { Global, Module } from '@nestjs/common';

/**
 * PrismaModule
 *
 * A globally available NestJS module that provides the {@link PrismaService}.
 *
 * - Decorated with `@Global()`, making it accessible throughout the application
 *   without the need to import it in every module.
 * - Registers `PrismaService` as a provider for database access using Prisma.
 * - Exports `PrismaService` so it can be injected via NestJS dependency injection
 *   in any other module.
 *
 * Example usage in another service:
 * ```ts
 * constructor(private readonly prisma: PrismaService) {}
 * ```
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
