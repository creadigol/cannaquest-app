import { z } from 'zod';

export const signupSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter your first name.'),
  lastName: z.string().trim().min(1, 'Enter your last name.'),
  email: z.string().trim().email('Enter a valid email address.'),
  phone: z.string().trim().min(8, 'Enter a valid phone number.'),
  medicareCardNumber: z.string().trim().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  acceptTerms: z.boolean().refine((value) => value, 'Please accept the terms to continue.'),
});

export type SignupFormValues = z.infer<typeof signupSchema>;
