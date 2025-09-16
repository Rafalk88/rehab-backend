import { z } from 'zod';

const isUUID = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

export const PasswordSchema = z
  .string()
  .min(12, 'Hasło musi zawierać co najmniej 12 znaków')
  .regex(/[A-Z]/, 'Hasło musi zawierac co najmniej jedną dużą literę')
  .regex(/[0-9]/, 'Hasło musi zawierac co najmniej jedną liczbę')
  .regex(/[^A-Za-z0-9]/, 'Hasło musi zawierac co najmniej jeden znak specjalny');

// RegisterUserSchema
export const RegisterUserSchema = z.object({
  firstName: z
    .string()
    .min(1, 'Imię jest wymagane')
    .trim()
    .regex(/^[A-Za-z]+$/, 'Imię może zawierać tylko litery A-Z lub a-z')
    .transform((val) => val.toLowerCase()),
  surname: z
    .string()
    .min(1, 'Nazwisko jest wymagane')
    .trim()
    .regex(/^[A-Za-z-]+$/, 'Nazwisko może zawierać tylko litery A-Z, a-z oraz znak "-"')
    .transform((val) => val.toLowerCase()),
  sexId: z.string().refine((val) => isUUID(val), {
    message: 'Niepoprawne id płci (UUID)',
  }),
  organizationalUnitId: z.string().refine((val) => isUUID(val), {
    message: 'Niepoprawne id jednostki (UUID)',
  }),
  password: PasswordSchema,
});

// & Type
export type RegisterUserSchema = z.infer<typeof RegisterUserSchema>;

// LoginUserSchema
export const LoginUserSchema = z.object({
  login: z
    .string()
    .min(1, 'Login jest wymagany')
    .trim()
    .regex(/^[A-Za-z0-9-]+$/, 'Login może zawierać tylko litery, cyfry oraz znak "-"')
    .transform((val) => val.toLowerCase()),
  password: z.string().min(1, 'Hasło jest wymagane'),
});

// & Type
export type LoginUserSchema = z.infer<typeof LoginUserSchema>;

// RefreshTokenSchema
export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

// & Type
export type RefreshTokenSchema = z.infer<typeof RefreshTokenSchema>;

// ChangePasswordSchema
export const ChangePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8),
  confirmNewPassword: z.string().min(8),
});

// & Type
export type ChangePasswordSchema = z.infer<typeof ChangePasswordSchema>;
