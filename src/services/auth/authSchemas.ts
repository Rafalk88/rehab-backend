import { z } from 'zod';

export const PasswordSchema = z
  .string()
  .min(12, 'Hasło musi zawierać co najmniej 12 znaków')
  .regex(/[A-Z]/, 'Hasło musi zawierac co najmniej jedną dużą literę')
  .regex(/[0-9]/, 'Hasło musi zawierac co najmniej jedną liczbę')
  .regex(/[^A-Za-z0-9]/, 'Hasło musi zawierac co najmniej jeden znak specjalny');

// RegisterUserSchema
export const RegisterUserSchema = z.object({
  firstName: z.string().min(1, 'Imię jest wymagane'),
  surname: z.string().min(1, 'Nazwisko jest wymagane'),
  sexId: z.string(),
  organizationalUnitId: z.string(),
  password: PasswordSchema,
});

// & Type
export type RegisterUserSchema = z.infer<typeof RegisterUserSchema>;

// LoginUserSchema
export const LoginUserSchema = z.object({
  login: z.string().min(1, 'Login jest wymagany'),
  password: z.string().min(1, 'Hasło jest wymagane'),
});

// & Type
export type LoginUserSchema = z.infer<typeof LoginUserSchema>;
