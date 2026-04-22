'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useUsers } from '@/hooks';
import { useLanguage } from '@/components/language-context';
import { TableSkeleton } from '@/components/skeletons';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { usersService } from '@/services';
import type { UserResponse } from '@/dto/users/users.dto';

const statusColors: Record<string, 'success' | 'warning' | 'danger'> = {
  active: 'success',
  suspended: 'warning',
  banned: 'danger',
};

function UserRolesCell({ userId }: { userId: string }) {
  const { data: roles = [], isLoading } = useQuery<string[]>({
    queryKey: ['user-roles', userId],
    queryFn: () => usersService.getUserRoles(userId),
    enabled: !!userId,
    staleTime: 60000,
  });

  if (isLoading) {
    return <span className="text-gray-400 text-sm">Loading...</span>;
  }

  if (roles.length === 0) {
    return <Badge variant="default">User</Badge>;
  }

  return (
    <div className="flex gap-1 flex-wrap">
      {roles.map((role: string) => (
        <Badge key={role} variant="info" className="text-xs">
          {role}
        </Badge>
      ))}
    </div>
  );
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

  const handleSearch = useCallback((query: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('search', query);
    url.searchParams.set('page', '1');
    window.history.pushState({}, '', url);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set('page', newPage.toString());
    window.history.pushState({}, '', url);
  }, []);

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
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-red-600 dark:text-red-400 mb-4">{t('error')}</p>
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
      render: (user) => (
        <span className="font-medium text-gray-900 dark:text-white">{user.nickname}</span>
      ),
    },
    {
      key: 'email',
      header: t('email'),
      render: (user) => (
        <span className="text-gray-600 dark:text-gray-400">{user.email}</span>
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
      render: (user) => <UserRolesCell userId={user.id} />,
    },
    {
      key: 'createdAt',
      header: t('createdAt'),
      render: (user) => (
        <span className="text-gray-600 dark:text-gray-400">
          {new Date(user.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('actions'),
      className: 'w-20',
      render: (user) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleViewUser(user.id)}
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