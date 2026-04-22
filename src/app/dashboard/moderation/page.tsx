'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { healthService } from '@/services';
import { useLanguage } from '@/components/language-context';
import { PageSkeleton } from '@/components/skeletons';

export default function ModerationPage() {
  const { t } = useLanguage();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => healthService.getDashboardStats(),
    staleTime: 30000,
  });

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('moderation')}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('activeSanctions')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats?.activeSanctions ?? 0}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}