import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import express from 'express';
import { HttpExceptionFilter } from './common/filters/http-exceptions.filter.js';
import logger from './lib/logger.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Helmet
  app.use(helmet());
  logger.info('Helmet middleware enabled');

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
  logger.info(`CORS configured for origins: ${allowedOrigins.join(', ')}`);

  // Rate limit
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  logger.info('Rate limiting middleware enabled');

  // Request logging
  app.use(morgan('combined'));
  logger.info('Morgan middleware enabled for HTTP request logging');

  // JSON body parser limit
  app.use(express.json({ limit: '10kb' }));
  logger.info('Body parser with size limit 10kb enabled');

  // Global error filter
  app.useGlobalFilters(new HttpExceptionFilter());
  logger.info('Global error filter enabled');

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
