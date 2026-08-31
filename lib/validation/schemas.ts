import { z } from 'zod';

/**
 * Reusable Zod schemas and React Hook Form helpers for Simply Raizal.
 * Future forms (story editor, profile, polls) extend these patterns.
 */

export const signInSchema = z.object({
  email: z.string().min(1, 'required').email('invalidEmail'),
  password: z.string().min(8, 'weakPassword'),
});

export const signUpSchema = z
  .object({
    name: z.string().min(2, 'required').max(80, 'required'),
    email: z.string().min(1, 'required').email('invalidEmail'),
    password: z.string().min(8, 'weakPassword'),
    confirmPassword: z.string().min(8, 'weakPassword'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'passwordMismatch',
    path: ['confirmPassword'],
  });

export const profileSchema = z.object({
  name: z.string().min(2).max(80).optional().nullable(),
  image: z.string().url().optional().nullable().or(z.literal('')),
  preferredLocale: z.enum(['en', 'es']),
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type ProfileValues = z.infer<typeof profileSchema>;
