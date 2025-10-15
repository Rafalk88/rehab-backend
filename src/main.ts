import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from '#common/filters/http-exceptions.filter.js';
import { LoggerService } from '#lib/logger/logger.service.js';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';

const isDev = process.env.NODE_ENV === 'development';
const frontendUrl = process.env.FRONTEND_URL;
const isHttps = frontendUrl?.startsWith('https://');
const port = process.env.PORT;
const ONE_YEAR = 31536000;
const MINUTE_IN_MS = 60 * 1000;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(LoggerService);

  // Helmet
  app.use(helmet());
  logger.log('✅ Helmet middleware enabled');

  if (!isDev && isHttps) {
    app.use(
      helmet.hsts({
        maxAge: ONE_YEAR,
        includeSubDomains: true,
        preload: true,
      }),
    );
    logger.log('✅ HSTS enabled (HTTPS enforced for 1 year)');
  } else {
    logger.log('⚠️ HSTS skipped (running on HTTP or localhost)');
  }

  // CORS
  const allowedOrigins = [frontendUrl || 'http://localhost:3000'];
  app.enableCors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });
  logger.log(`✅ CORS configured for origins: ${allowedOrigins.join(', ')}`);

  // Rate limit
  app.use(
    rateLimit({
      windowMs: 15 * MINUTE_IN_MS,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  logger.log('✅ Rate limiting middleware enabled');

  // Request logging
  app.use(morgan(isDev ? 'dev' : 'combined'));
  logger.log('✅ Morgan middleware enabled for HTTP request logging');

  // JSON body parser limit
  app.use(express.json({ limit: '10kb' }));
  logger.log('✅ Body parser with size limit 10kb enabled');

  // Global validation (DTOs)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  logger.log('✅ Global validation pipe enabled');

  // Global error filter
  app.useGlobalFilters(new HttpExceptionFilter());
  logger.log('✅ Global error filter enabled');

  // API prefix
  app.setGlobalPrefix('api/v1');
  logger.log('✅ Global API prefix set to /api/v1');

  await app.listen(port || 3001);
  logger.log(`🚀 Server running on ${isHttps ? 'HTTPS' : 'HTTP'} at port ${port}`);
}
bootstrap();
