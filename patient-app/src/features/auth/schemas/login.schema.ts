import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((val) => {
      if (!val || val.length === 0) return true;
      const clean = val.replace(/\s+/g, '');
      return /^04\d{8}$/.test(clean);
    }, 'Enter a valid Australian mobile number (e.g. 0412 345 678).'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
