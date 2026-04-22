'use client';

export const dynamic = 'force-dynamic';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, FileText, LifeBuoy, Shield, TrendingUp, RefreshCw, 
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { BarChart } from '@/shared/components/ui/Charts';
import { StatsGrid, StatCard } from '@/shared/components/dashboard/DashboardStats';
import { QuickActionsGrid } from '@/shared/components/dashboard/DashboardQuickActions';
import { ServerStatusCard } from '@/shared/components/dashboard/DashboardServerStatus';
import { SystemPerformanceCard } from '@/shared/components/dashboard/DashboardSystemPerformance';
import { healthService } from '@/services';
import { useLanguage } from '@/components/language-context';
import { PageSkeleton } from '@/components/skeletons';
import { useAuthStore } from '@/store';

function useAutoRefresh<T>(queryKey: string[], queryFn: () => Promise<T>, interval: number = 30000) {
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn,
    staleTime: interval / 2,
    refetchInterval: interval,
  });
  return { data: data as T | undefined, isLoading };
}

export default function DashboardPage() {
  const { isRTL } = useLanguage();
  const { isAuthenticated } = useAuthStore();

  const { data: stats, isLoading: statsLoading } = useAutoRefresh(
    ['dashboard-stats'],
    () => healthService.getDashboardStats(),
    30000
  );

  const { data: metrics, isLoading: metricsLoading } = useAutoRefresh(
    ['health-metrics'],
    () => healthService.getMetrics().catch(() => null),
    15000
  );

  const activityChartData = useMemo(() => [
    { label: isRTL ? 'المستخدمين' : 'Users', value: stats?.totalUsers ?? 0, color: 'bg-indigo-500' },
    { label: isRTL ? 'التقارير' : 'Reports', value: stats?.activeReports ?? 0, color: 'bg-amber-500' },
    { label: isRTL ? 'التذاكر' : 'Tickets', value: stats?.openTickets ?? 0, color: 'bg-blue-500' },
    { label: isRTL ? 'العقوبات' : 'Sanctions', value: stats?.activeSanctions ?? 0, color: 'bg-red-500' },
  ], [stats, isRTL]);

  const heapUsed = useMemo(() => metrics ? formatBytes(metrics.memory.heapUsed) : '-', [metrics]);
  const heapTotal = useMemo(() => metrics ? formatBytes(metrics.memory.heapTotal) : '-', [metrics]);
  const memoryFree = useMemo(() => {
    if (!metrics) return '-';
    const free = metrics.memory.heapTotal - metrics.memory.heapUsed;
    return formatBytes(free);
  }, [metrics]);
  const redisActive = metrics?.redis?.isRedisEnabled ?? false;
  const activeConnections = metrics?.activeConnections ?? 0;

  const isLoading = statsLoading || metricsLoading;
  if (isLoading) return <PageSkeleton />;
  
  if (!isAuthenticated) return null;

  const quickActions = [
    { icon: <Users className="w-5 h-5" />, label: isRTL ? 'المستخدمين' : 'Users', href: '/dashboard/users' },
    { icon: <FileText className="w-5 h-5" />, label: isRTL ? 'التقارير' : 'Reports', href: '/dashboard/reports' },
    { icon: <LifeBuoy className="w-5 h-5" />, label: isRTL ? 'الدعم' : 'Support', href: '/dashboard/support' },
    // { icon: <Shield className="w-5 h-5" />, label: isRTL ? 'العقوبات' : 'Moderation', href: '/dashboard/moderation' },
    // { icon: <Gamepad2 className="w-5 h-5" />, label: isRTL ? 'المباريات' : 'Matches', href: '/dashboard/matches' },
    // { icon: <FolderOpen className="w-5 h-5" />, label: isRTL ? 'الغرف' : 'Rooms', href: '/dashboard/rooms' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isRTL ? 'لوحة التحكم' : 'Dashboard'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isRTL ? 'نظرة عامة على نشاط النظام' : 'System Activity Overview'}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <RefreshCw className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      <StatsGrid>
        <StatCard
          title={isRTL ? 'إجمالي المستخدمين' : 'Total Users'}
          value={stats?.totalUsers ?? 0}
          icon={<Users className="w-5 h-5" />}
          color="indigo"
          href="/dashboard/users"
        />
        <StatCard
          title={isRTL ? 'التقارير النشطة' : 'Active Reports'}
          value={stats?.activeReports ?? 0}
          icon={<FileText className="w-5 h-5" />}
          color="yellow"
          href="/dashboard/reports"
        />
        <StatCard
          title={isRTL ? 'التذاكر المفتوحة' : 'Open Tickets'}
          value={stats?.openTickets ?? 0}
          icon={<LifeBuoy className="w-5 h-5" />}
          color="blue"
          href="/dashboard/support"
        />
        <StatCard
          title={isRTL ? 'العقوبات النشطة' : 'Active Sanctions'}
          value={stats?.activeSanctions ?? 0}
          icon={<Shield className="w-5 h-5" />}
          color="red"
          href="/dashboard/moderation"
        />
      </StatsGrid>

      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4">
        <QuickActionsGrid actions={quickActions} />
      </div>

      <Card padding="none" className="overflow-hidden border border-gray-200 dark:border-gray-700">
        <CardHeader className="p-5 pb-2 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
                <TrendingUp className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-gray-900 dark:text-white">
                  {isRTL ? 'نظرة عامة على النشاط' : 'Activity Overview'}
                </CardTitle>
                <p className="text-xs text-gray-500 dark:text-gray-400">{isRTL ? 'إحصائيات البيانات' : 'Data Statistics'}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-4">
          <BarChart data={activityChartData} height={200} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ServerStatusCard
          heapUsed={heapUsed}
          heapTotal={heapTotal}
          memoryFree={memoryFree}
          redis={{ active: redisActive, label: redisActive ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'غير نشط' : 'Inactive') }}
          activeConnections={activeConnections}
        />
        
        <SystemPerformanceCard 
          users={stats?.totalUsers ?? 0}
          memory={heapUsed}
        />
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}