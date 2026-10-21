import { z } from 'zod';

export const otpSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code.'),
});

export type OtpFormValues = z.infer<typeof otpSchema>;
