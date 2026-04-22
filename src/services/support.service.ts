import apiClient from '@/lib/api/api-client';
import { CreateTicketSchema, type CreateTicketRequest, UpdateTicketStatusSchema, type UpdateTicketStatusRequest } from '@/dto/support/support.dto';
import type { SupportTicket, PaginatedResponse, ListParams } from '@/types';

export const supportService = {
  async getTickets(params?: ListParams & { status?: string }): Promise<PaginatedResponse<SupportTicket>> {
    return apiClient.get<PaginatedResponse<SupportTicket>>('/support/tickets', { params });
  },

  async getMyTickets(params?: ListParams): Promise<PaginatedResponse<SupportTicket>> {
    return apiClient.get<PaginatedResponse<SupportTicket>>('/support/tickets/me', { params });
  },

  async getTicket(id: string): Promise<SupportTicket> {
    return apiClient.get<SupportTicket>(`/support/tickets/${id}`);
  },

  async createTicket(data: CreateTicketRequest): Promise<SupportTicket> {
    const validated = CreateTicketSchema.parse(data);
    return apiClient.post<SupportTicket>('/support/tickets', validated);
  },

  async replyToTicket(id: string, message: string): Promise<void> {
    await apiClient.post(`/support/tickets/${id}/reply`, { message });
  },

  async updateStatus(id: string, data: UpdateTicketStatusRequest): Promise<void> {
    const validated = UpdateTicketStatusSchema.parse(data);
    await apiClient.post(`/support/tickets/${id}/status`, validated);
  },

  async assignTicket(id: string, assignedUserId: string): Promise<void> {
    await apiClient.post(`/support/tickets/${id}/assign`, { assignedUserId });
  },

  async addNote(id: string, note: string): Promise<void> {
    await apiClient.post(`/support/tickets/${id}/note`, { note });
  },

  async getEscalations(): Promise<PaginatedResponse<SupportTicket>> {
    return apiClient.get<PaginatedResponse<SupportTicket>>('/support/admin/escalations');
  },

  async escalateTicket(id: string, reason: string): Promise<void> {
    await apiClient.post(`/support/tickets/${id}/escalate`, { reason });
  },
};

export default supportService;