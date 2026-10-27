'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '@/services';
import type { Notification, NotificationListParams, NotificationListResult } from '@/services/notifications.service';

export const useNotifications = (params?: NotificationListParams) => {
  return useQuery<NotificationListResult>({
    queryKey: ['notifications', params],
    queryFn: () => notificationsService.getNotifications(params),
    staleTime: 30000,
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export type { Notification, NotificationListParams, NotificationListResult };
