import express, { type Express } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import authRouter from '@services/auth/authRouter';
import { errorHandler } from '@/middlewares';

dotenv.config();

const app: Express = express();
app.use(cors());
app.use(express.json());
app.use('/auth', authRouter);
app.use(errorHandler);

export default app;
