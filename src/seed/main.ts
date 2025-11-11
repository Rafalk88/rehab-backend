import 'dotenv/config';
import { SeedModule } from './seed.module.js';
import { SeedService } from './seed.service.js';
import { LoggerService } from '../lib/logger/logger.service.js';
import { NestFactory } from '@nestjs/core';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(SeedModule);
  const seedService = appContext.get(SeedService);
  const logger = appContext.get(LoggerService);

  logger.log('✅ Start seeding...');
  await seedService.seedSystemUser();
  logger.log('✅ System user added');
  await seedService.seedSexModel();
  logger.log('✅ Ses Model filed');
  await seedService.seedRoles();
  logger.log('✅ Add some basic roles');
  await seedService.seedTestUser();
  logger.log('✅ Test user added');
  await seedService.seedBlockedUser();
  logger.log('✅ Blocked user added');
  await seedService.seedUserRoles();
  logger.log('✅ Add roles to users');
  await appContext.close();
}

bootstrap();
