import { z } from 'zod';

export const RoleResponseSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  priority: z.union([z.string(), z.number()]).optional().nullable(),
  isSystem: z.boolean().optional().nullable(),
  isDefault: z.boolean().optional().nullable(),
  scope: z.enum(['GLOBAL', 'ROOM']).optional().nullable(),
  inheritsFrom: z.string().optional().nullable(),
  permissions: z.array(z.string()).optional().nullable(),
  permissionsMask: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  updatedAt: z.string().optional().nullable(),
});

export type RoleResponse = z.infer<typeof RoleResponseSchema>;

export const RoleSchema = RoleResponseSchema;

export type Role = z.infer<typeof RoleSchema>;

export const PermissionSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  updatedAt: z.string().optional().nullable(),
});

export type Permission = z.infer<typeof PermissionSchema>;
