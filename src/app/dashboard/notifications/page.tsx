'use client';

import { useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Bell, CheckCheck, Eye, Clock } from 'lucide-react';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks';
import { useLanguage } from '@/components/language-context';
import { TableSkeleton } from '@/components/skeletons';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';

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

export default function NotificationsPage() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const unreadOnly = searchParams.get('unread') === 'true';

  const { data, isLoading, error, refetch } = useNotifications({
    page,
    limit: 20,
    unreadOnly,
  });

  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const handlePageChange = useCallback((newPage: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set('page', newPage.toString());
    window.history.pushState({}, '', url);
  }, []);

  const handleMarkAsRead = useCallback(async (id: string) => {
    try {
      await markReadMutation.mutateAsync(id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, [markReadMutation]);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllReadMutation.mutateAsync();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }, [markAllReadMutation]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('notifications')}</h1>
        <TableSkeleton rows={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-red-600 dark:text-red-400 mb-4">{t('error')}</p>
        <Button onClick={() => refetch()}>{t('retry')}</Button>
      </div>
    );
  }

  const columns: Column<Notification>[] = [
    {
      key: 'isRead',
      header: t('status'),
      render: (notification) => (
        <Badge variant={notification.isRead ? 'default' : 'success'}>
          {notification.isRead ? t('read') : t('unread')}
        </Badge>
      ),
    },
    {
      key: 'type',
      header: t('type'),
      render: (notification) => (
        <Badge variant="outline">{notification.type}</Badge>
      ),
    },
    {
      key: 'title',
      header: t('title'),
      render: (notification) => (
        <span className="font-medium text-gray-900 dark:text-white">{notification.title}</span>
      ),
    },
    {
      key: 'message',
      header: t('message'),
      render: (notification) => (
        <span className="text-gray-600 dark:text-gray-400 max-w-md truncate">
          {notification.message}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: t('date'),
      render: (notification) => (
        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
          <Clock className="w-4 h-4" />
          {new Date(notification.createdAt).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: 'actions',
      header: t('actions'),
      className: 'w-24',
      render: (notification) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleMarkAsRead(notification.id)}
          disabled={notification.isRead || markReadMutation.isPending}
          className="gap-1.5"
        >
          <Eye className="w-4 h-4" />
          {t('markRead')}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('notifications')}</h1>
        <div className="flex items-center gap-2">
          {data?.unreadCount && data.unreadCount > 0 && (
            <Badge variant="success" className="mr-2">
              {data.unreadCount} {t('unread')}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={markAllReadMutation.isPending}
            className="gap-1.5"
          >
            <CheckCheck className="w-4 h-4" />
            {t('markAllRead')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            {t('notifications')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={data?.data || []}
            columns={columns}
            pagination={
              data && {
                page: data.page,
                limit: data.limit,
                total: data.total,
                totalPages: data.totalPages,
                onPageChange: handlePageChange,
              }
            }
            emptyMessage={t('noNotifications')}
          />
        </CardContent>
      </Card>
    </div>
  );
}