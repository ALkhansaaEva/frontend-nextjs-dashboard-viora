import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supportService } from '@/services';
import type { ListParams, PaginatedResponse, SupportTicket, CreateTicketRequest, ReplyTicketRequest, UpdateTicketStatusRequest } from '@/types';

export const useTickets = (params?: ListParams) => {
  return useQuery<PaginatedResponse<SupportTicket>>({
    queryKey: ['tickets', params],
    queryFn: () => supportService.getTickets(params),
    staleTime: 30000,
  });
};

export const useTicket = (id: string) => {
  return useQuery<SupportTicket>({
    queryKey: ['ticket', id],
    queryFn: () => supportService.getTicket(id),
    enabled: !!id,
    staleTime: 30000,
  });
};

export const useCreateTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTicketRequest) => supportService.createTicket(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
};

export const useReplyTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, data }: { ticketId: string; data: ReplyTicketRequest }) =>
      supportService.replyToTicket(ticketId, data.content),
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
    },
  });
};

export const useUpdateTicketStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, data }: { ticketId: string; data: UpdateTicketStatusRequest }) =>
      supportService.updateStatus(ticketId, data),
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
};

export const useAssignTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, assigneeId }: { ticketId: string; assigneeId: string }) =>
      supportService.assignTicket(ticketId, assigneeId),
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
};

export const useAddTicketNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, note }: { ticketId: string; note: string }) =>
      supportService.addNote(ticketId, note),
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
    },
  });
};