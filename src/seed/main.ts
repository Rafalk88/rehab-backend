import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { SeedModule } from './seed.module.js';
import { SeedService } from './seed.service.js';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(SeedModule);
  const seedService = appContext.get(SeedService);

  await seedService.seedTestUser();
  await appContext.close();
}

bootstrap();
