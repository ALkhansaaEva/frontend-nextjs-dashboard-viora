import apiClient from './api.client';
import type { PaginatedResponse } from '@/types';

export type NotificationPushStatus =
  | 'pending'
  | 'disabled'
  | 'no_tokens'
  | 'delivered'
  | 'failed';

/**
 * Backend `NotificationResponseDto`. `body` mirrors `message`; there is no
 * `userId` in the response — ownership is implicit in the session, so the
 * previous `userId: string` field was never actually populated.
 * `type` is a 29-value enum (see `modules/notifications/entities`); it is kept
 * as `string` because the UI only renders it verbatim.
 */
export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  body: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  delivered: boolean;
  deliveredAt: string | null;
  pushStatus: NotificationPushStatus;
  pushAttemptCount: number;
  pushDeliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListParams {
  page?: number;
  limit?: number;
  /** Backend filter. Sent as the literal string 'true'/'false' — the DTO
   *  transforms anything that is not `true`/`'true'` into `false`. */
  unreadOnly?: boolean;
}

/** `GET /notifications` envelope: the list plus the unread count. There is no
 *  separate unread-count route. */
export type NotificationListResult = PaginatedResponse<Notification> & {
  unreadCount: number;
};

interface NotificationListEnvelope {
  notifications?: Notification[];
  unreadCount?: number;
  total?: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const notificationsService = {
  async getNotifications(
    params: NotificationListParams = {},
  ): Promise<NotificationListResult> {
    const limit = Math.min(Math.max(params.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const page = Math.max(params.page ?? 1, 1);
    const searchParams = new URLSearchParams({
      limit: String(limit),
      offset: String((page - 1) * limit),
    });
    if (params.unreadOnly !== undefined) {
      searchParams.set('unreadOnly', params.unreadOnly ? 'true' : 'false');
    }

    const raw =
      (await apiClient.get<NotificationListEnvelope>(
        `/notifications?${searchParams.toString()}`,
      )) ?? {};
    const data = raw.notifications ?? [];
    const total = raw.total ?? data.length;
    return {
      data,
      total,
      // The envelope carries limit/offset, not page/totalPages — derive them
      // from the request, otherwise an empty page reports limit 0 and the
      // table's pager reads "Page 1 of 1" forever.
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      unreadCount: raw.unreadCount ?? 0,
    };
  },

  async markAsRead(id: string): Promise<Notification> {
    return apiClient.post<Notification>(`/notifications/${id}/read`);
  },

  async markAllAsRead(): Promise<{ success: boolean; count: number }> {
    return apiClient.post('/notifications/read-all');
  },
};

export default notificationsService;
