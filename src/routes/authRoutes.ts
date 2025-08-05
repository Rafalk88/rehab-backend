import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { registerUser, login } from '@services/authService';

const router: ExpressRouter = Router();

router.post('/register-user', registerUser);
router.post('/login', login);

export default router;
