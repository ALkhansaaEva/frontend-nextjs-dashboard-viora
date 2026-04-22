'use client';

import { useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { reportsService } from '@/services';
import { useLanguage } from '@/components/language-context';
import { TableSkeleton } from '@/components/skeletons';
import { useHasPermission } from '@/hooks';
import type { Report, TakeActionRequest } from '@/types';
import type { UpdateReportStatusRequest } from '@/dto/reports/reports.dto';
import { ReportsFiltersSection } from './sections/ReportsFiltersSection';
import { ReportsListSection } from './sections/ReportsListSection';
import { ReportDetailSection } from './sections/ReportDetailSection';

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const hasPermission = useHasPermission();
  const canManageReports = hasPermission('manage_reports');

  const page = parseInt(searchParams.get('page') || '1', 10);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['reports', page, statusFilter],
    queryFn: () =>
      reportsService.getReports({
        page,
        limit: 10,
        status: statusFilter || undefined,
      }),
    staleTime: 30000,
  });

  const takeActionMutation = useMutation({
    mutationFn: ({
      reportId,
      action,
      reason,
    }: {
      reportId: string;
      action: TakeActionRequest['action'];
      reason: string;
    }) => reportsService.takeAction(reportId, { action, reason }),
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

  const handlePageChange = useCallback((newPage: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set('page', newPage.toString());
    window.history.pushState({}, '', url);
  }, []);

  const handleStatusChange = useCallback((status: string) => {
    setStatusFilter(status);
    const url = new URL(window.location.href);
    if (status) {
      url.searchParams.set('status', status);
    } else {
      url.searchParams.delete('status');
    }
    url.searchParams.set('page', '1');
    window.history.pushState({}, '', url);
  }, []);

  const handleUpdateStatus = useCallback(
    (status: UpdateReportStatusRequest['status']) => {
      if (selectedReport) {
        updateStatusMutation.mutate({ reportId: selectedReport.id, status });
      }
    },
    [selectedReport, updateStatusMutation]
  );

  const handleTakeAction = useCallback(
    (action: TakeActionRequest['action'], reason: string) => {
      if (selectedReport) {
        takeActionMutation.mutate({ reportId: selectedReport.id, action, reason });
      }
    },
    [selectedReport, takeActionMutation]
  );

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
            Monitor and process community violations through your high-precision radar.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1 border-primary/20 bg-primary/5 text-primary">
            Active Monitoring: ON
          </Badge>
        </div>
      </div>

      <ReportsFiltersSection
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        onSearchChange={setSearchQuery}
        onStatusChange={handleStatusChange}
      />

      <ReportsListSection reports={data?.data || []} onSelectReport={setSelectedReport} />

      {data && data.total > 0 && (
        <div className="flex items-center justify-between px-2 pt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Scanning page {data.page} of {data.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={data.page <= 1}
              onClick={() => handlePageChange(data.page - 1)}
              className="rounded-xl border-gray-200 dark:border-gray-800"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={data.page >= data.totalPages}
              onClick={() => handlePageChange(data.page + 1)}
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
        onUpdateStatus={handleUpdateStatus}
        onTakeAction={handleTakeAction}
        onClose={() => setSelectedReport(null)}
      />
    </div>
  );
}