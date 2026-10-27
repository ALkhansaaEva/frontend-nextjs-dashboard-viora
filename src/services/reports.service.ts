import apiClient from '@/lib/api/api-client';
import {
  CreateReportSchema,
  type CreateReportRequest,
  UpdateReportStatusSchema,
  type UpdateReportStatusRequest,
  ReportActionRequestSchema,
  type ReportActionRequest,
  AddEvidenceSchema,
  type AddEvidenceRequest,
} from '@/dto/reports/reports.dto';
import type { Report } from '@/types';

/** GET /reports returns `{ reports, total }` — offset/limit paging, no `page`. */
export interface ReportsListResponse {
  reports: Report[];
  total: number;
}

export interface ReportsListParams {
  status?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export const reportsService = {
  async getReports(params?: ReportsListParams): Promise<ReportsListResponse> {
    return apiClient.get<ReportsListResponse>('/reports', { params });
  },

  async getMyReports(params?: Pick<ReportsListParams, 'limit' | 'offset'>): Promise<ReportsListResponse> {
    return apiClient.get<ReportsListResponse>('/reports/me', { params });
  },

  async getReport(id: string): Promise<Report> {
    return apiClient.get<Report>(`/reports/${id}`);
  },

  async createReport(data: CreateReportRequest): Promise<Report> {
    const validated = CreateReportSchema.parse(data);
    return apiClient.post<Report>('/reports', validated);
  },

  async addEvidence(id: string, evidence: AddEvidenceRequest): Promise<void> {
    const validated = AddEvidenceSchema.parse(evidence);
    await apiClient.post(`/reports/${id}/evidence`, validated);
  },

  async takeAction(id: string, action: ReportActionRequest): Promise<void> {
    const validated = ReportActionRequestSchema.parse(action);
    await apiClient.post(`/reports/${id}/action`, validated);
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
