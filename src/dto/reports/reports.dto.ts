import { z } from 'zod';

export const CreateReportSchema = z.object({
  reportedUserId: z.string().uuid(),
  reason: z.string().min(5),
  category: z.string().optional(),
  evidenceUrls: z.array(z.string().url()).optional(),
});

export type CreateReportRequest = z.infer<typeof CreateReportSchema>;

export const UpdateReportStatusSchema = z.object({
  status: z.enum(['pending', 'investigating', 'resolved', 'dismissed']),
});

export type UpdateReportStatusRequest = z.infer<typeof UpdateReportStatusSchema>;

export const AddEvidenceSchema = z.object({
  url: z.string().url(),
  type: z.enum(['image', 'svg', 'animated_webp', 'video', 'audio', 'document']),
  description: z.string().optional(),
});

export type AddEvidenceRequest = z.infer<typeof AddEvidenceSchema>;
