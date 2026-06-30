'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, FileText, LifeBuoy, Shield, TrendingUp, RefreshCw,
  Gamepad2, DoorOpen, Trophy, Crown, Activity, Server, Zap, Clock,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { BarChart, DonutChart } from '@/shared/components/ui/Charts';
import { StatsGrid, StatCard } from '@/shared/components/dashboard/DashboardStats';
import { QuickActionsGrid } from '@/shared/components/dashboard/DashboardQuickActions';
import { ServerStatusCard } from '@/shared/components/dashboard/DashboardServerStatus';
import { SystemPerformanceCard } from '@/shared/components/dashboard/DashboardSystemPerformance';
import { healthService } from '@/services';
import { useLanguage } from '@/components/language-context';
import { PageSkeleton } from '@/components/skeletons';
import { useAuthStore } from '@/store';

// ── Animated counter ──

function useAnimatedValue(target: number, duration = 1000) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === value) return;
    const start = value;
    const startTime = performance.now();
    const raf = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + (target - start) * eased));
      if (progress < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

// ── Live clock ──

function useLiveTime() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

// ── Helpers ──

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function useAutoRefresh<T>(queryKey: string[], queryFn: () => Promise<T>, interval = 30000, enabled = true) {
  return useQuery({ queryKey, queryFn, staleTime: interval / 2, refetchInterval: enabled ? interval : false, enabled });
}

// ── Page ──

export default function DashboardPage() {
  const { isRTL } = useLanguage();
  const { isAuthenticated } = useAuthStore();
  const liveTime = useLiveTime();

  const { data: stats, isLoading: statsLoading } = useAutoRefresh(
    ['dashboard-stats'], () => healthService.getDashboardStats(), 30000, isAuthenticated,
  );
  const { data: metrics, isLoading: metricsLoading } = useAutoRefresh(
    ['health-metrics'], () => healthService.getMetrics().catch(() => null), 15000, isAuthenticated,
  );

  const animUsers = useAnimatedValue(stats?.totalUsers ?? 0);
  const animActive = useAnimatedValue(stats?.dailyActiveUsers ?? 0);
  const animMatches = useAnimatedValue(stats?.totalMatches ?? 0);
  const animRooms = useAnimatedValue(stats?.activeRooms ?? 0);
  const animAchievements = useAnimatedValue(stats?.totalAchievements ?? 0);
  const animReports = useAnimatedValue(stats?.activeReports ?? 0);
  const animTickets = useAnimatedValue(stats?.openTickets ?? 0);
  const animSanctions = useAnimatedValue(stats?.activeSanctions ?? 0);

  const heapUsed = useMemo(() => metrics?.memory ? formatBytes(metrics.memory.heapUsed) : '-', [metrics]);
  const heapTotal = useMemo(() => metrics?.memory ? formatBytes(metrics.memory.heapTotal) : '-', [metrics]);
  const memoryFree = useMemo(() => {
    if (!metrics?.memory) return '-';
    return formatBytes(metrics.memory.heapTotal - metrics.memory.heapUsed);
  }, [metrics]);
  const redisActive = metrics?.redis?.isRedisEnabled ?? false;
  const activeConnections = metrics?.activeConnections ?? 0;
  const uptime = metrics?.uptime ?? 0;

  const systemHealthPct = useMemo(() => {
    if (!metrics?.memory) return 85;
    return Math.round((1 - metrics.memory.heapUsed / metrics.memory.heapTotal) * 100);
  }, [metrics]);

  const uptimeDisplay = uptime > 86400
    ? `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h`
    : uptime > 3600
      ? `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`
      : `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`;

  const activityChartData = useMemo(() =>
    [
      { label: isRTL ? 'المستخدمين' : 'Users', value: animUsers, color: 'bg-indigo-500' },
      { label: isRTL ? 'التقارير' : 'Reports', value: animReports, color: 'bg-amber-500' },
      { label: isRTL ? 'التذاكر' : 'Tickets', value: animTickets, color: 'bg-blue-500' },
      { label: isRTL ? 'العقوبات' : 'Sanctions', value: animSanctions, color: 'bg-red-500' },
      { label: isRTL ? 'الغرف' : 'Rooms', value: animRooms, color: 'bg-emerald-500' },
    ].filter(d => d.value > 0),
    [animUsers, animReports, animTickets, animSanctions, animRooms, isRTL],
  );

  const isLoading = statsLoading || metricsLoading;
  if (isLoading) return <PageSkeleton />;
  if (!isAuthenticated) return null;

  const quickActions = [
    { icon: <Users className="w-5 h-5" />, label: isRTL ? 'المستخدمين' : 'Users', href: '/dashboard/users' },
    { icon: <FileText className="w-5 h-5" />, label: isRTL ? 'التقارير' : 'Reports', href: '/dashboard/reports' },
    { icon: <LifeBuoy className="w-5 h-5" />, label: isRTL ? 'الدعم' : 'Support', href: '/dashboard/support' },
    { icon: <Shield className="w-5 h-5" />, label: isRTL ? 'العقوبات' : 'Moderation', href: '/dashboard/moderation' },
    { icon: <Gamepad2 className="w-5 h-5" />, label: isRTL ? 'المباريات' : 'Matches', href: '/dashboard/matches' },
    { icon: <DoorOpen className="w-5 h-5" />, label: isRTL ? 'الغرف' : 'Rooms', href: '/dashboard/rooms' },
    { icon: <Trophy className="w-5 h-5" />, label: isRTL ? 'الإنجازات' : 'Achievements', href: '/dashboard/achievements' },
    { icon: <Crown className="w-5 h-5" />, label: isRTL ? 'الرتب' : 'Ranks', href: '/dashboard/ranks' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-lg shadow-indigo-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isRTL ? 'لوحة التحكم' : 'Dashboard'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {isRTL ? 'نظرة عامة على نشاط النظام' : 'System Activity Overview'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <RefreshCw className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
              {liveTime.toLocaleTimeString()}
            </span>
          </div>
          <Badge variant="success" className="gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            {isRTL ? 'مباشر' : 'Live'}
          </Badge>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <StatsGrid>
        <StatCard title={isRTL ? 'إجمالي المستخدمين' : 'Total Users'} value={animUsers} icon={<Users className="w-5 h-5" />} color="indigo" href="/dashboard/users" />
        <StatCard title={isRTL ? 'النشطون يومياً' : 'Daily Active'} value={animActive} icon={<Activity className="w-5 h-5" />} color="purple" />
        <StatCard title={isRTL ? 'المباريات' : 'Matches'} value={animMatches} icon={<Gamepad2 className="w-5 h-5" />} color="green" href="/dashboard/matches" />
        <StatCard title={isRTL ? 'الغرف النشطة' : 'Active Rooms'} value={animRooms} icon={<DoorOpen className="w-5 h-5" />} color="blue" href="/dashboard/rooms" />
      </StatsGrid>

      <StatsGrid>
        <StatCard title={isRTL ? 'الإنجازات' : 'Achievements'} value={animAchievements} icon={<Trophy className="w-5 h-5" />} color="yellow" href="/dashboard/achievements" />
        <StatCard title={isRTL ? 'التقارير النشطة' : 'Active Reports'} value={animReports} icon={<FileText className="w-5 h-5" />} color="red" href="/dashboard/reports" />
        <StatCard title={isRTL ? 'التذاكر المفتوحة' : 'Open Tickets'} value={animTickets} icon={<LifeBuoy className="w-5 h-5" />} color="blue" href="/dashboard/support" />
        <StatCard title={isRTL ? 'العقوبات النشطة' : 'Active Sanctions'} value={animSanctions} icon={<Shield className="w-5 h-5" />} color="red" href="/dashboard/moderation" />
      </StatsGrid>

      {/* ── Quick Actions ── */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {isRTL ? 'إجراءات سريعة' : 'Quick Actions'}
          </h3>
          <Badge variant="default">{quickActions.length} {isRTL ? 'إجراء' : 'actions'}</Badge>
        </div>
        <QuickActionsGrid actions={quickActions} />
      </div>

      {/* ── Charts + System Health ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card padding="none" className="overflow-hidden border border-gray-200 dark:border-gray-700 lg:col-span-2">
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
              <Badge variant="outline" className="text-[10px]">{isRTL ? 'تحديث تلقائي' : 'Auto-refresh'}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-4">
            {activityChartData.length > 0 ? (
              <BarChart data={activityChartData} height={200} />
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">{isRTL ? 'لا توجد بيانات' : 'No data available'}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                <Server className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-gray-900 dark:text-white">
                  {isRTL ? 'صحة النظام' : 'System Health'}
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center pt-2">
            <DonutChart value={systemHealthPct} maxValue={100} size={140} color="emerald">
              <div className="text-center">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{systemHealthPct}%</span>
              </div>
            </DonutChart>
            <div className="grid grid-cols-2 gap-4 w-full mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <div className="text-center">
                <p className="text-xs text-gray-500">{isRTL ? 'وقت التشغيل' : 'Uptime'}</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{uptimeDisplay}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">{isRTL ? 'الاتصالات' : 'Connections'}</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{activeConnections}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Server Status + Performance ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ServerStatusCard
          heapUsed={heapUsed}
          heapTotal={heapTotal}
          memoryFree={memoryFree}
          redis={{ active: redisActive, label: redisActive ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'غير نشط' : 'Inactive') }}
          activeConnections={activeConnections}
        />
        <SystemPerformanceCard
          users={animUsers}
          memory={heapUsed}
        />
      </div>

      {/* ── Bottom info ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {isRTL ? 'آخر تحديث' : 'Last updated'}: {liveTime.toLocaleTimeString()}
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            {isRTL ? 'زمن الاستجابة' : 'Avg response'}: {stats?.avgResponseTime ?? (metrics ? '0' : '-')}ms
          </span>
        </div>
        <span className="flex items-center gap-1.5">
          <Server className="w-3.5 h-3.5" />
          {isRTL ? 'حمل النظام' : 'System load'}: {stats?.systemLoad ?? '-'}%
        </span>
      </div>

    </div>
  );
}
