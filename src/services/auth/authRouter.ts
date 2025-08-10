import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { authController } from '@services/auth/authController';

const router: ExpressRouter = Router();

router.post('/register-user', authController.registerUser);
router.post('/login', authController.loginUser);

export default router;
