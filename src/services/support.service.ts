import apiClient from '@/lib/api/api-client';
import {
  CreateTicketSchema,
  ReplyTicketSchema,
  NoteSchema,
  EscalateTicketSchema,
  UpdateTicketStatusSchema,
  type CreateTicketRequest,
  type UpdateTicketStatusRequest,
} from '@/dto/support/support.dto';
import type { SupportTicket, TicketMessage } from '@/types';

/** Query params of GET /support/tickets and GET /support/tickets/me. */
export interface TicketListParams {
  status?: string;
  limit?: number;
  offset?: number;
}

/** Verbatim `getAllTickets` return: an offset-paged list, no `page` meta. */
export interface TicketListResponse {
  tickets: SupportTicket[];
  total: number;
}

/**
 * A ticket_messages row as `getTicketById` actually returns it (TicketMessage
 * entity): the body is `message` and the author is `senderUserId`.
 * Shared type in `@/types` carries the same shape.
 */
export type TicketMessageRecord = TicketMessage;

/** Verbatim `getTicketById` return: the ticket row plus its `messages` array. */
export type TicketDetail = Omit<SupportTicket, 'messages'> & {
  messages: TicketMessageRecord[];
};

/** Verbatim `getEscalationsAdmin` return (TicketEscalation rows, not tickets). */
export interface EscalationListResponse {
  data: unknown[];
  total: number;
}

export const supportService = {
  /** GET /support/tickets?status&limit&offset — offset paging, no `page` param. */
  async getTickets(params?: TicketListParams): Promise<TicketListResponse> {
    return apiClient.get<TicketListResponse>('/support/tickets', { params });
  },

  /** GET /support/tickets/me?limit&offset */
  async getMyTickets(params?: Omit<TicketListParams, 'status'>): Promise<TicketListResponse> {
    return apiClient.get<TicketListResponse>('/support/tickets/me', { params });
  },

  /** GET /support/tickets/:id — ticket plus its messages. */
  async getTicket(id: string): Promise<TicketDetail> {
    return apiClient.get<TicketDetail>(`/support/tickets/${id}`);
  },

  async createTicket(data: CreateTicketRequest): Promise<SupportTicket> {
    return apiClient.post<SupportTicket>('/support/tickets', CreateTicketSchema.parse(data));
  },

  async replyToTicket(id: string, message: string): Promise<void> {
    await apiClient.post(`/support/tickets/${id}/reply`, ReplyTicketSchema.parse({ message }));
  },

  async updateStatus(id: string, data: UpdateTicketStatusRequest): Promise<void> {
    await apiClient.post(`/support/tickets/${id}/status`, UpdateTicketStatusSchema.parse(data));
  },

  async assignTicket(id: string, assignedUserId: string): Promise<void> {
    await apiClient.post(`/support/tickets/${id}/assign`, { assignedUserId });
  },

  /** Internal notes live in ticket_internal_notes — the detail route never returns them. */
  async addNote(id: string, note: string): Promise<void> {
    await apiClient.post(`/support/tickets/${id}/note`, NoteSchema.parse({ note }));
  },

  /** GET /support/admin/escalations — TicketEscalation rows, not SupportTicket rows. */
  async getEscalations(params?: { limit?: number; offset?: number }): Promise<EscalationListResponse> {
    return apiClient.get<EscalationListResponse>('/support/admin/escalations', { params });
  },

  async escalateTicket(id: string, reason: string): Promise<void> {
    await apiClient.post(`/support/tickets/${id}/escalate`, EscalateTicketSchema.parse({ reason }));
  },
};

export default supportService;
