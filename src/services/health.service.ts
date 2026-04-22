import apiClient from './api.client';
import adminService from './admin.service';
import reportsService from './reports.service';
import supportService from './support.service';
import moderationService from './moderation.service';
import type { HealthMetrics, DashboardStats } from '@/types';

async function fetchWithFallback<T>(
  fetchFn: () => Promise<{ total?: number; data?: T[] }>,
  fallbackFn?: () => Promise<{ total?: number; data?: T[] }>
): Promise<number> {
  try {
    const result = await fetchFn();
    if (result && result.total !== undefined && result.total > 0) {
      return result.total;
    }
    if (result && result.data && result.data.length > 0) {
      return result.data.length;
    }
  } catch {
    console.warn('[Stats] Primary fetch failed, trying fallback');
  }
  
  if (fallbackFn) {
    try {
      const fallbackResult = await fallbackFn();
      return fallbackResult.total ?? fallbackResult.data?.length ?? 0;
    } catch {
      console.warn('[Stats] Fallback also failed');
    }
  }
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
    const [totalUsers, activeReports, openTickets, activeSanctions] = await Promise.all([
      fetchWithFallback(
        () => adminService.getUsers({ limit: 1 }),
        () => adminService.getUsers({ limit: 1000 })
      ),
      fetchWithFallback(
        () => reportsService.getReports({ limit: 1, status: 'pending' }),
        () => reportsService.getReports({ limit: 1000 })
      ),
      fetchWithFallback(
        () => supportService.getTickets({ limit: 1, status: 'open' }),
        () => supportService.getTickets({ limit: 1000 })
      ),
      fetchWithFallback(
        () => moderationService.getAllActiveSanctions({ limit: 1 }),
        () => moderationService.getAllActiveSanctions({ limit: 1000 })
      ),
    ]);

    return {
      totalUsers,
      activeReports,
      openTickets,
      activeSanctions,
    };
  },
};

export default healthService;