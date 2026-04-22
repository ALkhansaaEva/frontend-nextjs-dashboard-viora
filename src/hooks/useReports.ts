import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsService } from '@/services';
import type { ListParams, PaginatedResponse, Report, AddEvidenceRequest, TakeActionRequest, UpdateStatusRequest } from '@/types';

export const useReports = (params?: ListParams) => {
  return useQuery<PaginatedResponse<Report>>({
    queryKey: ['reports', params],
    queryFn: () => reportsService.getReports(params),
    staleTime: 30000,
  });
};

export const useReport = (id: string) => {
  return useQuery<Report>({
    queryKey: ['report', id],
    queryFn: () => reportsService.getReport(id),
    enabled: !!id,
    staleTime: 30000,
  });
};

export const useAddEvidence = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, data }: { reportId: string; data: AddEvidenceRequest }) =>
      reportsService.addEvidence(reportId, data),
    onSuccess: (_, { reportId }) => {
      queryClient.invalidateQueries({ queryKey: ['report', reportId] });
    },
  });
};

export const useTakeAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, data }: { reportId: string; data: TakeActionRequest }) =>
      reportsService.takeAction(reportId, data),
    onSuccess: (_, { reportId }) => {
      queryClient.invalidateQueries({ queryKey: ['report', reportId] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};

export const useUpdateReportStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, data }: { reportId: string; data: UpdateStatusRequest }) =>
      reportsService.updateStatus(reportId, data),
    onSuccess: (_, { reportId }) => {
      queryClient.invalidateQueries({ queryKey: ['report', reportId] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};

export const useAssignReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, assigneeId }: { reportId: string; assigneeId: string }) =>
      reportsService.assignReport(reportId, assigneeId),
    onSuccess: (_, { reportId }) => {
      queryClient.invalidateQueries({ queryKey: ['report', reportId] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};