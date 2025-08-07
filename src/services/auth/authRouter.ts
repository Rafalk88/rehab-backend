import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { authService } from '@services/auth/authService';

const router: ExpressRouter = Router();

router.post('/register-user', authService.registerUser);
router.post('/login', authService.loginUser);

export default router;
