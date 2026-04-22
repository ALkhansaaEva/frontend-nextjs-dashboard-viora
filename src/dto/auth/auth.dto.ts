import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type LoginRequest = z.infer<typeof LoginSchema>;

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nickname: z.string().min(2).optional(),
});

export type RegisterRequest = z.infer<typeof RegisterSchema>;

export const OTPVerifySchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  otp: z.string().length(6),
});

export type OTPVerifyRequest = z.infer<typeof OTPVerifySchema>;
