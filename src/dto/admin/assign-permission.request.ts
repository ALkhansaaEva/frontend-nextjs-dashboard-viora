import { z } from 'zod';

export const AssignPermissionSchema = z.object({
  permissionCode: z.string().min(1),
});

export type AssignPermissionRequest = z.infer<typeof AssignPermissionSchema>;
