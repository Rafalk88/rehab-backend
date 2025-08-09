import express, { type Express } from 'express';
import dotenv from 'dotenv';
import authRoutes from '@services/auth/authRouter';

dotenv.config();

const app: Express = express();

app.use(express.json());

app.use('/auth', authRoutes);

export default app;
