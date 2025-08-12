import { Router, type Router as ExpressRouter } from 'express';
import { authController } from '@/services/auth/v1/auth.controller';
import { LoginUserSchema, RegisterUserSchema } from '@/services/auth/v1/auth.schemas';
import { validate } from '@/middlewares/validate.middleware';
import { authentication } from '@/middlewares/authentication.middleware';
import { authorization } from '@/middlewares/authorization.middleware';

const router: ExpressRouter = Router();

router.post(
  '/register-user',
  validate(RegisterUserSchema),
  authentication,
  authorization('admin'),
  authController.registerUser,
);
router.post('/login', validate(LoginUserSchema), authController.loginUser);

export default router;
