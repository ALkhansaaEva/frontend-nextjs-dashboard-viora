'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye } from 'lucide-react';
import { useUsers } from '@/hooks';
import { useLanguage } from '@/components/language-context';
import { TableSkeleton } from '@/components/skeletons';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import type { UserResponse, UserRoleSummary } from '@/dto/users/users.dto';
import { UserAvatar } from '@/shared/components/ui/UserAvatar';

const statusColors: Record<string, 'success' | 'warning' | 'danger'> = {
  active: 'success',
  suspended: 'warning',
  banned: 'danger',
};

// The API returns role summaries ({code, name}) for the list and plain codes from
// the legacy role endpoint; render either without ever passing an object to JSX.
function roleLabel(role: UserRoleSummary): string {
  return typeof role === 'string' ? role : role.name || role.code;
}

export default function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search') || '';

  const { data, isLoading, error, refetch } = useUsers({
    page,
    limit: 20,
    search: search || undefined,
  });

  // DataTable reports every keystroke; debounce so the list is not refetched per character.
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
  }, []);

  const handleSearch = useCallback((query: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      const url = new URL(window.location.href);
      if (query) {
        url.searchParams.set('search', query);
      } else {
        url.searchParams.delete('search');
      }
      url.searchParams.set('page', '1');
      router.push(`${url.pathname}?${url.searchParams.toString()}`);
    }, 300);
  }, [router]);

  const handlePageChange = useCallback((newPage: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set('page', newPage.toString());
    router.push(`${url.pathname}?${url.searchParams.toString()}`);
  }, [router]);

  const handleViewUser = useCallback((userId: string) => {
    router.push(`/dashboard/users/${userId}`);
  }, [router]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('users')}</h1>
        <TableSkeleton rows={10} />
      </div>
    );
  }

  if (error) {
    const status = (error as { statusCode?: number })?.statusCode;
    const forbidden = status === 403;
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-red-600 dark:text-red-400 mb-2">
          {forbidden ? 'You do not have permission to view users.' : t('error')}
        </p>
        {forbidden && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            This page needs the <code className="font-mono">users.read</code> permission.
          </p>
        )}
        <Button onClick={() => refetch()}>
          {t('retry')}
        </Button>
      </div>
    );
  }

  const columns: Column<UserResponse>[] = [
    {
      key: 'nickname',
      header: t('username'),
      render: (user) => {
        const name = user.nickname || user.email || 'Unknown user';
        return (
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar src={user.avatar} name={name} />
            <div className="min-w-0">
              <p
                className="font-medium text-gray-900 dark:text-white truncate max-w-[14rem]"
                title={name}
              >
                {name}
              </p>
              {user.immutableUserId && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  #{user.immutableUserId}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'email',
      header: t('email'),
      render: (user) => (
        <span
          className="block truncate max-w-[16rem] text-gray-600 dark:text-gray-400"
          title={user.email}
        >
          {user.email}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('status'),
      render: (user) => (
        <Badge variant={statusColors[user.status] || 'default'}>
          {t(user.status)}
        </Badge>
      ),
    },
    {
      key: 'roles',
      header: t('roles'),
      render: (user) => {
        const roles = user.roles ?? [];
        if (roles.length === 0) {
          return <Badge variant="default">No Role</Badge>;
        }
        return (
          <div className="flex gap-1 flex-wrap">
            {roles.map((role, index) => {
              const label = roleLabel(role);
              return (
                <Badge key={`${label}-${index}`} variant="info" className="text-xs">
                  {label}
                </Badge>
              );
            })}
          </div>
        );
      },
    },
    {
      key: 'createdAt',
      header: t('createdAt'),
      render: (user) => {
        const date = user.createdAt ? new Date(user.createdAt) : null;
        const validDate = date && !isNaN(date.getTime());
        return (
          <span className="text-gray-600 dark:text-gray-400">
            {validDate ? date.toLocaleDateString() : '—'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: t('actions'),
      className: 'w-20',
      render: (user) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleViewUser(user.immutableUserId || user.id)}
          className="gap-1.5"
        >
          <Eye className="w-4 h-4" />
          {t('view')}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('users')}</h1>

      <DataTable
        data={data?.data || []}
        columns={columns}
        searchable
        searchPlaceholder={t('searchUsers')}
        onSearch={handleSearch}
        pagination={
          data && {
            page: data.page,
            limit: data.limit,
            total: data.total,
            totalPages: data.totalPages,
            onPageChange: handlePageChange,
          }
        }
        emptyMessage={t('noData')}
      />
    </div>
  );
}
