import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from '#common/filters/http-exceptions.filter.js';
import { LoggerService } from '#lib/logger/logger.service.js';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(LoggerService);

  // Helmet
  app.use(helmet());
  logger.log('Helmet middleware enabled');

  // CORS
  const allowedOrigins = [process.env.FRONTEND_URL || 'http://localhost:3000'];
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
  logger.log(`CORS configured for origins: ${allowedOrigins.join(', ')}`);

  // Rate limit
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  logger.log('Rate limiting middleware enabled');

  // Request logging
  app.use(morgan('combined'));
  logger.log('Morgan middleware enabled for HTTP request logging');

  // JSON body parser limit
  app.use(express.json({ limit: '10kb' }));
  logger.log('Body parser with size limit 10kb enabled');

  // Global validation (DTOs)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown fields
      forbidNonWhitelisted: true, // extra fields blocked
      transform: true, // automatic type transform e.g. string -> number
    }),
  );
  logger.log('Global validation pipe enabled');

  // Global error filter
  app.useGlobalFilters(new HttpExceptionFilter());
  logger.log('Global error filter enabled');

  // API prefix
  app.setGlobalPrefix('api/v1');
  logger.log('Global API prefix set to /api/v1');

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
