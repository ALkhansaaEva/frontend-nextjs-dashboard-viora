import { z } from 'zod';

/** Backend `ReportStatus` (common/enums) — DB enum, not a free string. */
export const ReportStatusSchema = z.enum(['open', 'investigating', 'resolved', 'dismissed']);

/** Backend `ReportCategory` (common/enums) — DB enum. */
export const ReportCategorySchema = z.enum([
  'harassment',
  'spam',
  'cheating',
  'inappropriate_content',
  'other',
]);

/** Backend `ReportActionDto.action` — escalate | dismiss | warn | sanction. */
export const ReportActionTypeSchema = z.enum(['escalate', 'dismiss', 'warn', 'sanction']);

/** Backend `CreateReportDto`: { targetUserId, category, description }. */
export const CreateReportSchema = z.object({
  // ponytail: shape-checked only; the backend owns the immutableUserId|UUID
  // pattern (USER_REFERENCE_PATTERN) and rejects with 422.
  targetUserId: z.string().min(1),
  category: ReportCategorySchema,
  description: z.string().min(1).max(5000),
});

export type CreateReportRequest = z.infer<typeof CreateReportSchema>;

/** Backend `UpdateReportStatusDto`: { status }. */
export const UpdateReportStatusSchema = z.object({
  status: ReportStatusSchema,
});

export type UpdateReportStatusRequest = z.infer<typeof UpdateReportStatusSchema>;

/** Backend `ReportActionDto`: { action, note? }. Unknown keys are stripped. */
export const ReportActionRequestSchema = z.object({
  action: ReportActionTypeSchema,
  note: z.string().max(5000).optional(),
});

export type ReportActionRequest = z.infer<typeof ReportActionRequestSchema>;

/** Backend `AddEvidenceDto`: { evidenceType, url }. */
export const AddEvidenceSchema = z.object({
  evidenceType: z.string().min(1).max(50),
  url: z.string().min(1).max(2000),
});

export type AddEvidenceRequest = z.infer<typeof AddEvidenceSchema>;
