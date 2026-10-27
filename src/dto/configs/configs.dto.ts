import { z } from 'zod';

export const FeatureFlagSchema = z.object({
  id: z.string().optional(),
  key: z.string(),
  enabled: z.boolean(),
  rolloutPercent: z.number().int().min(0).max(100).nullable().optional(),
  conditions: z.unknown().nullable().optional(),
  description: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type FeatureFlag = z.infer<typeof FeatureFlagSchema>;

export const SystemConfigSchema = z.object({
  game: z.record(z.string(), z.any()).optional(),
  rewards: z.record(z.string(), z.any()).optional(),
  economy: z.record(z.string(), z.any()).optional(),
  room: z.record(z.string(), z.any()).optional(),
});


export type SystemConfig = z.infer<typeof SystemConfigSchema>;
