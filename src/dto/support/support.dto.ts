import { z } from 'zod';

export const CreateTicketSchema = z.object({
  subject: z.string().min(3),
  description: z.string().min(5),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  attachmentUrls: z.array(z.string().url()).optional(),
});

export type CreateTicketRequest = z.infer<typeof CreateTicketSchema>;

export const UpdateTicketStatusSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
});

export type UpdateTicketStatusRequest = z.infer<typeof UpdateTicketStatusSchema>;

export const ReplyTicketSchema = z.object({
  message: z.string().min(1),
  attachmentUrls: z.array(z.string().url()).optional(),
});

export type ReplyTicketRequest = z.infer<typeof ReplyTicketSchema>;
