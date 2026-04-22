import { z } from 'zod';

export const CreateReportSchema = z.object({
  reportedUserId: z.string().uuid(),
  reason: z.string().min(5),
  category: z.string().optional(),
});

export type CreateReportRequest = z.infer<typeof CreateReportSchema>;

export const UpdateReportStatusSchema = z.object({
  status: z.enum(['pending', 'investigating', 'resolved', 'dismissed']),
});

export type UpdateReportStatusRequest = z.infer<typeof UpdateReportStatusSchema>;
