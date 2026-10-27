import { z } from 'zod';

/** TicketStatus enum — common/enums/ticket-status.enum.ts */
export const TICKET_STATUSES = [
  'open',
  'in_progress',
  'waiting_on_user',
  'resolved',
  'closed',
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

/**
 * POST /support/tickets — CreateTicketDto (modules/support/dto/create-ticket.dto.ts).
 * The ticket row has no priority/attachment column; `message` is stored as the
 * first ticket_messages row.
 */
export const CreateTicketSchema = z.object({
  subject: z.string().min(3),
  message: z.string().min(5),
  category: z.string().trim().min(1).optional(),
});

export type CreateTicketRequest = z.infer<typeof CreateTicketSchema>;

/** POST /support/tickets/:id/status — raw body `{ status }`. */
export const UpdateTicketStatusSchema = z.object({
  status: z.enum(TICKET_STATUSES),
});

export type UpdateTicketStatusRequest = z.infer<typeof UpdateTicketStatusSchema>;

/** POST /support/tickets/:id/reply — raw body `{ message }`. */
export const ReplyTicketSchema = z.object({
  message: z.string().trim().min(1),
});

export type ReplyTicketRequest = z.infer<typeof ReplyTicketSchema>;

/** POST /support/tickets/:id/note — raw body `{ note }`. */
export const NoteSchema = z.object({
  note: z.string().trim().min(1),
});

export type NoteRequest = z.infer<typeof NoteSchema>;

/** POST /support/tickets/:id/escalate — raw body `{ reason }`. */
export const EscalateTicketSchema = z.object({
  reason: z.string().trim().min(1),
});

export type EscalateTicketRequest = z.infer<typeof EscalateTicketSchema>;
