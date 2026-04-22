import { z } from 'zod';

export const CreateStoreBundleSchema = z.object({
  sku: z.string().min(1),
  title: z.record(z.string(), z.string()),
  priceGems: z.union([z.string(), z.number()]),
  priceCoins: z.union([z.string(), z.number()]).optional(),
  isActive: z.boolean().optional(),
  items: z.array(z.object({
    itemId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).optional(),
});

export type CreateStoreBundleRequest = z.infer<typeof CreateStoreBundleSchema>;

export const UpdateStoreBundleSchema = CreateStoreBundleSchema.partial();

export type UpdateStoreBundleRequest = z.infer<typeof UpdateStoreBundleSchema>;

export const PurchaseBundleSchema = z.object({
  bundleId: z.string().uuid(),
});

export type PurchaseBundleRequest = z.infer<typeof PurchaseBundleSchema>;