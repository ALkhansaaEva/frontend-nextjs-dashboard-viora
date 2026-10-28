import { z } from 'zod';

const WalletSchema = z.object({
  userId: z.string(),
  /** Backend `Wallet.gameCurrency` — numeric(30,0), transported as a string. */
  gameCurrency: z.string(),
});

const RoleSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string().optional(),
});
export type RoleSummary = z.infer<typeof RoleSchema>;

/**
 * The user list returns role summaries (`{ code, name }`), while role detail
 * endpoints return full role rows. Accept both shapes so neither can ever be
 * rendered as a raw object.
 */
const UserRoleSummarySchema = z.union([
  z.string(),
  z.object({
    id: z.string().optional(),
    code: z.string(),
    name: z.string().optional(),
  }),
]);

export type UserRoleSummary = z.infer<typeof UserRoleSummarySchema>;

export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  immutableUserId: z.string().regex(/^\d{1,13}$/).nullable().optional(),
  email: z.string().email(),
  nickname: z.string().optional(),
  avatar: z.string().optional(),
  status: z.enum(['active', 'suspended', 'banned']),
  createdAt: z.string(),
  wallet: WalletSchema.optional(),
  roles: z.array(UserRoleSummarySchema).optional(),
});

export type UserResponse = z.infer<typeof UserResponseSchema>;

export const AdjustBalanceSchema = z.object({
  currency: z.enum(['GAME_CURRENCY']),
  /** Positive integer string — backend `AdjustBalanceDto.amount` (@Matches /^[1-9][0-9]*$/). */
  amount: z.string().regex(/^[1-9][0-9]*$/),
  action: z.enum(['add', 'deduct']),
  reason: z.string().min(3),
  operationId: z.string().uuid().optional(),
});

export type AdjustBalanceRequest = z.infer<typeof AdjustBalanceSchema>;
