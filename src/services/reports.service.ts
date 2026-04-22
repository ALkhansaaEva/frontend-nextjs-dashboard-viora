import apiClient from '@/lib/api/api-client';
import { CreateReportSchema, type CreateReportRequest, UpdateReportStatusSchema, type UpdateReportStatusRequest } from '@/dto/reports/reports.dto';
import type { Report, PaginatedResponse, ListParams } from '@/types';

export const reportsService = {
  async getReports(params?: ListParams & { status?: string; category?: string }): Promise<PaginatedResponse<Report>> {
    return apiClient.get<PaginatedResponse<Report>>('/reports', { params });
  },

  async getMyReports(params?: ListParams): Promise<PaginatedResponse<Report>> {
    return apiClient.get<PaginatedResponse<Report>>('/reports/me', { params });
  },

  async getReport(id: string): Promise<Report> {
    return apiClient.get<Report>(`/reports/${id}`);
  },

  async createReport(data: CreateReportRequest): Promise<Report> {
    const validated = CreateReportSchema.parse(data);
    return apiClient.post<Report>('/reports', validated);
  },

  async addEvidence(id: string, evidence: { url: string; type: string }): Promise<void> {
    await apiClient.post(`/reports/${id}/evidence`, evidence);
  },

  async takeAction(id: string, action: { action: string; reason?: string; durationHours?: number }): Promise<void> {
    await apiClient.post(`/reports/${id}/action`, action);
  },

  async updateStatus(id: string, data: UpdateReportStatusRequest): Promise<void> {
    const validated = UpdateReportStatusSchema.parse(data);
    await apiClient.post(`/reports/${id}/status`, validated);
  },

  async assignReport(id: string, assignedUserId: string): Promise<void> {
    await apiClient.post(`/reports/${id}/assign`, { assignedUserId });
  },
};

export default reportsService;