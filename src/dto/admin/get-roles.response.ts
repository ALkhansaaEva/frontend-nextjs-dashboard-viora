import { z } from 'zod';

export const RoleResponseSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  priority: z.union([z.string(), z.number()]).optional().nullable(),
  level: z.union([z.string(), z.number()]).optional().nullable(),
  isSystem: z.boolean().optional().nullable(),
  permissions: z.array(z.string()).optional().nullable(),
});

export type RoleResponse = z.infer<typeof RoleResponseSchema>;

export const RoleSchema = RoleResponseSchema.extend({
  scope: z.enum(['global', 'room']).optional().nullable(),
  inheritsFrom: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  updatedAt: z.string().optional().nullable(),
});

export type Role = z.infer<typeof RoleSchema>;

export const PermissionSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  updatedAt: z.string().optional().nullable(),
});

export type Permission = z.infer<typeof PermissionSchema>;
