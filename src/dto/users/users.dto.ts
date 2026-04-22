import { z } from 'zod';

const WalletSchema = z.object({
  userId: z.string(),
  gold: z.number(),
  gems: z.number(),
});

const RoleSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string().optional(),
});

export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  nickname: z.string().optional(),
  avatar: z.string().optional(),
  status: z.enum(['active', 'suspended', 'banned']),
  createdAt: z.string(),
  wallet: WalletSchema.optional(),
  roles: z.array(RoleSchema).optional(),
});

export type UserResponse = z.infer<typeof UserResponseSchema>;

export const AdjustBalanceSchema = z.object({
  currency: z.enum(['gold', 'gems']),
  amount: z.string(),
  action: z.enum(['add', 'deduct']),
  reason: z.string().min(3),
});

export type AdjustBalanceRequest = z.infer<typeof AdjustBalanceSchema>;
