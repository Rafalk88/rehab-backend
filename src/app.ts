import express, { type Express } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRouter from '@services/auth/authRouter';
import { errorHandler } from '@/middlewares';

dotenv.config();

const allowedOrigins = [process.env.FRONTEND_URL || 'http://localhost:3000'];

const app: Express = express();

// Helmet - nagłówki bezpieczeństwa
app.use(helmet());

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

// Rate limiting - max 100 requestów na 15 min z jednego IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Limit rozmiaru body
app.use(express.json({ limit: '10kb' }));

// routy
app.use('/auth', authRouter);

// Middleware do obsługi błędów
app.use(errorHandler);

export default app;
