import apiClient from './api.client';
import type { PaginatedResponse, ListParams } from '@/types';

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

interface RawPaginatedResponse<T> {
  data?: T[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  unreadCount?: number;
}

function normalizePaginatedResponse<T>(response: unknown): PaginatedResponse<Notification> & { unreadCount?: number } {
  const raw = response as RawPaginatedResponse<T>;
  const data = raw.data || [];
  return {
    data: data as unknown as Notification[],
    total: raw.total || data.length,
    page: raw.page || 1,
    limit: raw.limit || data.length,
    totalPages: raw.totalPages || 1,
    unreadCount: raw.unreadCount,
  };
}

export const notificationsService = {
  async getNotifications(params?: ListParams): Promise<PaginatedResponse<Notification> & { unreadCount?: number }> {
    const searchParams = new URLSearchParams();

    if (params?.page) {
      const offset = (params.page - 1) * (params.limit || 20);
      searchParams.set('offset', offset.toString());
    }
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('unreadOnly', params.search);

    const query = searchParams.toString();
    const url = query ? `/notifications?${query}` : '/notifications';

    const response = await apiClient.get<RawPaginatedResponse<Notification>>(url);
    return normalizePaginatedResponse(response);
  },

  async markAsRead(id: string): Promise<void> {
    await apiClient.post(`/notifications/${id}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await apiClient.post('/notifications/read-all');
  },
};

export default notificationsService;