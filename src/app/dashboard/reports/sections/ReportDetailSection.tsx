'use client';

import { useState } from 'react';
import { AlertTriangle, Ban } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Input } from '@/shared/components/ui/Input';
import { Modal } from '@/shared/components/ui/Modal';
import type { Report } from '@/types';
import type { UpdateReportStatusRequest } from '@/dto/reports/reports.dto';

interface ReportDetailSectionProps {
  report: Report | null;
  canManageReports: boolean;
  onUpdateStatus: (status: UpdateReportStatusRequest['status']) => void;
  onTakeAction: (action: 'warn' | 'mute' | 'ban' | 'dismiss', reason: string) => void;
  onClose: () => void;
}

const statusColors: Record<string, 'warning' | 'info' | 'success' | 'default'> = {
  pending: 'warning',
  investigating: 'info',
  resolved: 'success',
  dismissed: 'default',
};

export function ReportDetailSection({
  report,
  canManageReports,
  onUpdateStatus,
  onTakeAction,
  onClose,
}: ReportDetailSectionProps) {
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'warn' | 'mute' | 'ban' | 'dismiss'>('warn');
  const [actionReason, setActionReason] = useState('');

  if (!report) return null;

  const handleOpenActionModal = (action: typeof actionType) => {
    setActionType(action);
    setShowActionModal(true);
  };

  const handleConfirmAction = () => {
    onTakeAction(actionType, actionReason);
    setShowActionModal(false);
    setActionReason('');
  };

  return (
    <>
      <Modal isOpen={!!report} onClose={onClose} title="Protocol Violation Report" size="lg">
        <div className="space-y-6 scroll-smooth">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block mb-1">
                Source (Reporter)
              </label>
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-900 dark:text-white">
                  {report.reporter?.nickname || 'Anonymous'}
                </p>
                <Badge variant="outline" className="text-[10px] py-0">
                  {report.reporterId.slice(0, 8)}
                </Badge>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-red-500">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block mb-1">
                Target (Reported)
              </label>
              <div className="flex items-center gap-2">
                <p className="font-bold">{report.reportedUser?.nickname || 'Unidentified'}</p>
                <Badge variant="outline" className="text-[10px] py-0 border-red-500/20 text-red-500">
                  {report.reportedUserId.slice(0, 8)}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Violation Context
              </h4>
              <Badge variant={statusColors[report.status]}>{report.status}</Badge>
            </div>
            <div className="p-6 rounded-3xl bg-gray-900 text-gray-100 font-mono text-sm leading-relaxed border border-primary/10 shadow-inner">
              {report.reason ||
                'The reported node has performed an undefined operation. Further inspection of evidence is recommended.'}
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 block">
              Executive Decisions
            </label>
            <div className="flex flex-wrap gap-2">
              {canManageReports && report.status === 'pending' && (
                <>
                  <Button size="sm" onClick={() => onUpdateStatus('investigating')} className="bg-primary hover:bg-primary/90">
                    Initiate Investigation
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-900"
                    onClick={() => handleOpenActionModal('ban')}
                  >
                    <Ban className="w-4 h-4 mr-1.5" />
                    Instant Ban
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onUpdateStatus('dismissed')}>
                    Dismiss Intel
                  </Button>
                </>
              )}

              {canManageReports && report.status === 'investigating' && (
                <>
                  <Button size="sm" onClick={() => onUpdateStatus('resolved')} className="bg-emerald-600 hover:bg-emerald-700">
                    Finalize & Resolve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleOpenActionModal('warn')}>
                    Issue Warning
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onUpdateStatus('dismissed')}>
                    False Alarm
                  </Button>
                </>
              )}

              {['resolved', 'dismissed'].includes(report.status) && (
                <p className="text-sm text-gray-500 italic">This incident file has been archived and finalized.</p>
              )}

              {!canManageReports && (
                <p className="text-sm text-amber-500 italic">
                  You do not have administrative clearance to process this report.
                </p>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showActionModal} onClose={() => setShowActionModal(false)} title="Execute Action">
        <div className="space-y-6 dark:bg-gray-900">
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex gap-3 items-start">
            <AlertTriangle className="shrink-0 w-5 h-5" />
            <p>
              This will execute a <strong>{actionType}</strong> protocol on the target user. This action is logged and
              affects their security standing.
            </p>
          </div>

          <Input
            label="Action Justification"
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            placeholder="State the reason for this decision..."
            className="bg-transparent"
          />

          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={handleConfirmAction}
              disabled={!actionReason}
            >
              Confirm Execution
            </Button>
            <Button variant="outline" onClick={() => setShowActionModal(false)} className="w-24">
              Abort
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}