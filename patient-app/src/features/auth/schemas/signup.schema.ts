import { z } from 'zod';

export const signupSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter your first name.'),
  lastName: z.string().trim().min(1, 'Enter your last name.'),
  email: z.string().trim().email('Enter a valid email address.'),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/\s+/g, ''))
    .refine((value) => /^04\d{8}$/.test(value), 'Enter a valid Australian mobile number (04xx xxx xxx).'),
  medicareCardNumber: z.string().trim().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  acceptTerms: z.boolean().refine((value) => value, 'Please accept the terms to continue.'),
});

export type SignupFormValues = z.infer<typeof signupSchema>;
