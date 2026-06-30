import apiClient from './api.client';
import adminService from './admin.service';
import reportsService from './reports.service';
import supportService from './support.service';
import roomsService from './rooms.service';
import { matchesService } from './matches.service';
import { achievementsService } from './achievements.service';
import type { HealthMetrics, DashboardStats } from '@/types';

async function fetchCount<T>(
  fetchFn: () => Promise<{ total?: number; data?: T[] }>,
): Promise<number> {
  try {
    const result = await fetchFn();
    if (result?.total != null) return result.total;
    if (result?.data?.length) return result.data.length;
  } catch { /* ignore */ }
  return 0;
}

export const healthService = {
  async getMetrics(): Promise<HealthMetrics> {
    return apiClient.get<HealthMetrics>('/health/metrics');
  },

  async getHealth(): Promise<{ status: string }> {
    return apiClient.get<{ status: string }>('/health');
  },

  async getReady(): Promise<{ ready: boolean }> {
    return apiClient.get<{ ready: boolean }>('/health/ready');
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const [totalUsers, activeReports, openTickets, activeRooms, achievementsCount, matchResult, metrics] =
      await Promise.all([
        fetchCount(() => adminService.getUsers({ limit: 1 })),
        fetchCount(() => reportsService.getReports({ limit: 1, status: 'open' })),
        fetchCount(() => supportService.getTickets({ limit: 1, status: 'open' })),
        fetchCount(() => roomsService.getRooms({ limit: 1 })),
        achievementsService.getAchievements().then((a) => a.length).catch(() => 0),
        fetchCount(() => matchesService.getHistory({ limit: 1 })),
        apiClient.get<HealthMetrics>('/health/metrics').catch(() => null),
      ]);

    const heapUsed = metrics?.memory?.heapUsed ?? 0;
    const heapTotal = metrics?.memory?.heapTotal ?? 1;
    const systemLoad = Math.round((heapUsed / heapTotal) * 100);

    return {
      totalUsers,
      activeReports,
      openTickets,
      activeSanctions: 0,
      activeRooms,
      totalAchievements: achievementsCount,
      totalMatches: matchResult,
      dailyActiveUsers: 0,
      systemLoad,
      avgResponseTime: 0,
      onlineUsers: metrics?.activeConnections ?? 0,
    };
  },
};

export default healthService;