import express, { type Express } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import authRouter from '@services/auth/authRouter';
import { errorHandler } from '@/middlewares';
import logger from '@/config/logger';

dotenv.config();

const allowedOrigins = [process.env.FRONTEND_URL || 'http://localhost:3000'];

const app: Express = express();

// Helmet - nagłówki bezpieczeństwa
app.use(helmet());
logger.info('Helmet middleware enabled');

// CORS
app.use(
  cors({
    origin: function (origin, callback) {
      // pozwól jeśli brak origin (np. Postman) lub jest na liście
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // jeśli cookies/auth header
  })
);
logger.info(`CORS configured for origins: ${allowedOrigins.join(', ')}`);

// Rate limiting - max 100 requestów na 15 min z jednego IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);
logger.info('Rate limiting middleware enabled');

// Logowanie requestów (np. do konsoli)
app.use(morgan('combined'));
logger.info('Morgan middleware enabled for HTTP request logging');

// Limit rozmiaru body
app.use(express.json({ limit: '10kb' }));
logger.info('Body parser with size limit 10kb enabled');

// routy
app.use('/auth', authRouter);
logger.info('Auth routes mounted on /auth');

// Middleware do obsługi błędów
app.use(errorHandler);
logger.info('Error handler middleware enabled');

export default app;
