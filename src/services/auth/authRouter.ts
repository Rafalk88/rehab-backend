import { Router, type Router as ExpressRouter } from 'express';
import { authController, LoginUserSchema, RegisterUserSchema } from '@services/auth';
import { validate, authentication, authorization } from '@/middlewares';

const router: ExpressRouter = Router();

router.post(
  '/register-user',
  validate(RegisterUserSchema),
  authentication,
  authorization('admin'),
  authController.registerUser
);
router.post('/login', validate(LoginUserSchema), authController.loginUser);

export default router;
