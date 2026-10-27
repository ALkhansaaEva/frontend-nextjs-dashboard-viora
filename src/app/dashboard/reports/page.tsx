'use client';

import { useState, useCallback, useMemo } from 'react';
import { QueryErrorNotice } from '@/shared/components/ui/QueryState';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { reportsService } from '@/services';
import { useLanguage } from '@/components/language-context';
import { TableSkeleton } from '@/components/skeletons';
import { useHasPermission } from '@/hooks';
import type { Report } from '@/types';
import type { UpdateReportStatusRequest, ReportActionRequest } from '@/dto/reports/reports.dto';
import { ReportsFiltersSection } from './sections/ReportsFiltersSection';
import { ReportsListSection } from './sections/ReportsListSection';
import { ReportDetailSection } from './sections/ReportDetailSection';

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const hasPermission = useHasPermission();
  // Canonical backend permission (ReportsController mutation routes require
  // reports.execute; 'manage_reports' is a legacy bitmask code the backend
  // no longer grants under canonical RBAC) — see BACKEND_CAPABILITY_REGISTRY.
  const canManageReports = hasPermission('reports.execute');

  const LIMIT = 10;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // ponytail: backend GET /reports has no search param — filter the loaded
  // page client-side instead of inventing an unsupported query param.
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['reports', page, statusFilter, categoryFilter],
    queryFn: () =>
      reportsService.getReports({
        limit: LIMIT,
        offset: (page - 1) * LIMIT,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
      }),
    staleTime: 30000,
  });

  const reports = useMemo(() => data?.reports ?? [], [data?.reports]);

  const visibleReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter((r) =>
      [r.id, r.reporterUserId, r.targetUserId, r.category, r.description, r.reporterUser?.nickname, r.targetUser?.nickname]
        .filter((v): v is string => typeof v === 'string')
        .some((v) => v.toLowerCase().includes(q)),
    );
  }, [reports, searchQuery]);

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / LIMIT));

  const takeActionMutation = useMutation({
    mutationFn: ({
      reportId,
      action,
      note,
    }: {
      reportId: string;
      action: ReportActionRequest['action'];
      note: string;
    }) => reportsService.takeAction(reportId, { action, note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setSelectedReport(null);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      reportId,
      status,
    }: {
      reportId: string;
      status: UpdateReportStatusRequest['status'];
    }) => reportsService.updateStatus(reportId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ reportId, assignedUserId }: { reportId: string; assignedUserId: string }) =>
      reportsService.assignReport(reportId, assignedUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  // One filter change resets paging; the backend paginates from offset 0.
  const pushFilter = useCallback((key: 'status' | 'category', value: string) => {
    const url = new URL(window.location.href);
    if (value) {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
    url.searchParams.set('page', '1');
    window.history.pushState({}, '', url);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set('page', newPage.toString());
    window.history.pushState({}, '', url);
  }, []);

  const handleStatusChange = useCallback(
    (status: string) => {
      setStatusFilter(status);
      pushFilter('status', status);
    },
    [pushFilter]
  );

  const handleCategoryChange = useCallback(
    (category: string) => {
      setCategoryFilter(category);
      pushFilter('category', category);
    },
    [pushFilter]
  );

  const handleUpdateStatus = useCallback(
    (status: UpdateReportStatusRequest['status']) => {
      if (selectedReport) {
        updateStatusMutation.mutate({ reportId: selectedReport.id, status });
      }
    },
    [selectedReport, updateStatusMutation]
  );

  const handleTakeAction = useCallback(
    (action: ReportActionRequest['action'], note: string) => {
      if (selectedReport) {
        takeActionMutation.mutate({ reportId: selectedReport.id, action, note });
      }
    },
    [selectedReport, takeActionMutation]
  );

  const handleAssign = useCallback(
    (assignedUserId: string) => {
      if (selectedReport && assignedUserId) {
        assignMutation.mutate({ reportId: selectedReport.id, assignedUserId });
      }
    },
    [selectedReport, assignMutation]
  );

  if (isError) {

    return (

      <div className="space-y-6">

        <QueryErrorNotice error={error} onRetry={() => refetch()} />

      </div>

    );

  }


  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{t('reports')}</h1>
        </div>
        <TableSkeleton rows={8} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-300 dark:to-white bg-clip-text text-transparent">
            {t('reports')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Review, assign and resolve community reports.
          </p>
        </div>
      </div>

      <ReportsFiltersSection
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        categoryFilter={categoryFilter}
        onSearchChange={setSearchQuery}
        onStatusChange={handleStatusChange}
        onCategoryChange={handleCategoryChange}
      />

      <ReportsListSection reports={visibleReports} onSelectReport={setSelectedReport} />

      {(data?.total ?? 0) > 0 && (
        <div className="flex items-center justify-between px-2 pt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Scanning page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
              className="rounded-xl border-gray-200 dark:border-gray-800"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
              className="rounded-xl border-gray-200 dark:border-gray-800"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <ReportDetailSection
        report={selectedReport}
        canManageReports={canManageReports}
        isAssigning={assignMutation.isPending}
        onUpdateStatus={handleUpdateStatus}
        onTakeAction={handleTakeAction}
        onAssign={handleAssign}
        onClose={() => setSelectedReport(null)}
      />
    </div>
  );
}