import { z } from 'zod';

export const FeatureFlagSchema = z.object({
  key: z.string(),
  enabled: z.boolean(),
  value: z.string().optional(),
  description: z.string().optional(),
});

export type FeatureFlag = z.infer<typeof FeatureFlagSchema>;

export const SystemConfigSchema = z.object({
  game: z.record(z.string(), z.any()).optional(),
  rewards: z.record(z.string(), z.any()).optional(),
  economy: z.record(z.string(), z.any()).optional(),
  room: z.record(z.string(), z.any()).optional(),
});


export type SystemConfig = z.infer<typeof SystemConfigSchema>;
