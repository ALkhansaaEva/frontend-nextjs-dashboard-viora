import apiClient from './api.client';
import adminService from './admin.service';
import reportsService from './reports.service';
import supportService from './support.service';
import roomsService from './rooms.service';
import { matchesService } from './matches.service';
import type { HealthMetrics, DashboardStats, HealthReadyResponse, SystemHealthMetrics } from '@/types';

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

  /**
   * GET /health/ready — returns null (not a fabricated "ready" boolean) if the
   * call fails, since the backend's 503-on-degraded response body isn't safely
   * parseable through the shared error normalizer. A null result must render
   * as N/A, never as a false "down" status.
   */
  async getReady(): Promise<HealthReadyResponse | null> {
    try {
      return await apiClient.get<HealthReadyResponse>('/health/ready');
    } catch {
      return null;
    }
  },

  /** GET /health/system — full dashboard metrics (memory, redis, rbac cache, pubsub, capacity, queues). */
  async getSystemMetrics(): Promise<SystemHealthMetrics | null> {
    try {
      return await apiClient.get<SystemHealthMetrics>('/health/system');
    } catch {
      return null;
    }
  },

  /** POST /health/reset-circuits — requires admin.write. High-risk; caller must confirm explicitly. */
  async resetCircuits(): Promise<{ status: string; message: string }> {
    return apiClient.post<{ status: string; message: string }>('/health/reset-circuits');
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const [
      totalUsers,
      activeReports,
      openTickets,
      activeRooms,
      matchResult,
      activeSanctions,
      dailyActiveUsers,
      totalAchievements,
      metrics,
    ] = await Promise.all([
      fetchCount(() => adminService.getUsers({ limit: 1 })),
      fetchCount(() => reportsService.getReports({ limit: 1, status: 'open' })),
      fetchCount(() => supportService.getTickets({ limit: 1, status: 'open' })),
      fetchCount(() => roomsService.getRooms({ limit: 1 })),
      fetchCount(() => matchesService.getHistory({ limit: 1 })),
      fetchCount(() =>
        apiClient.get<{ total?: number }>('/moderation/sanctions/active-count'),
      ),
      fetchCount(() =>
        apiClient.get<{ total?: number }>('/admin/users/daily-active-count'),
      ),
      fetchCount(() =>
        apiClient.get<{ total?: number }>('/admin/rules?kind=ACHIEVEMENT&limit=1'),
      ),
      apiClient.get<HealthMetrics>('/health/metrics').catch(() => null),
    ]);

    // systemLoad is a genuine derived value (heapUsed/heapTotal) when metrics are available.
    // It is a memory-pressure proxy, not a real CPU/system load figure — labelled as such in the UI.
    const systemLoad = metrics?.memory
      ? Math.round((metrics.memory.heapUsed / metrics.memory.heapTotal) * 100)
      : null;

    return {
      totalUsers,
      activeReports,
      openTickets,
      activeSanctions,
      activeRooms,
      totalAchievements,
      totalMatches: matchResult,
      dailyActiveUsers,
      systemLoad,
      avgResponseTime:
        typeof metrics?.http?.avgResponseMs === 'number' &&
        metrics.http.avgResponseMs > 0
          ? metrics.http.avgResponseMs
          : null,
      onlineUsers: metrics?.activeConnections ?? undefined,
    };
  },
};

export default healthService;
