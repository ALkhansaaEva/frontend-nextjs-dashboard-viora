import { z } from 'zod';

export const CreateItemSchema = z.object({
  code: z.string().min(1),
  type: z.string().min(1),
  slot: z.string().min(1),
  scope: z.enum(['profile', 'room', 'game']),
  gameType: z.string().optional(),
  rarity: z.enum(['common', 'rare', 'epic', 'legendary']),
  title: z.record(z.string(), z.string()),
  priceGems: z.number().optional(),
  priceCoins: z.number().optional(),
  isStackable: z.boolean().optional(),
  defaultExpiryHours: z.number().optional(),
  assets: z.any().optional(),
  styleConfig: z.any().optional(),
  isActive: z.boolean().optional(),
});

export type CreateItemRequest = z.infer<typeof CreateItemSchema>;
