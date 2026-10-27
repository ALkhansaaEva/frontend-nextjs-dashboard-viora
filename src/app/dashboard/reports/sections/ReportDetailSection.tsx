'use client';

import { useState } from 'react';
import { AlertTriangle, Ban, UserCheck } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Input } from '@/shared/components/ui/Input';
import { Modal } from '@/shared/components/ui/Modal';
import { UserSelector } from '@/shared/components/ui/UserSelector';
import type { Report } from '@/types';
import type { UpdateReportStatusRequest, ReportActionRequest } from '@/dto/reports/reports.dto';

type ReportAction = ReportActionRequest['action'];

interface ReportDetailSectionProps {
  report: Report | null;
  canManageReports: boolean;
  isAssigning?: boolean;
  onUpdateStatus: (status: UpdateReportStatusRequest['status']) => void;
  onTakeAction: (action: ReportAction, note: string) => void;
  onAssign: (assignedUserId: string) => void;
  onClose: () => void;
}

const statusColors: Record<UpdateReportStatusRequest['status'], 'warning' | 'info' | 'success' | 'default'> = {
  open: 'warning',
  investigating: 'info',
  resolved: 'success',
  dismissed: 'default',
};

/**
 * Holds the pending assignee. The modal stays mounted between reports, so this
 * is remounted per report id — that resets the selection without an effect.
 */
function AssignPanel({
  isAssigning,
  onAssign,
}: {
  isAssigning?: boolean;
  onAssign: (assignedUserId: string) => void;
}) {
  const [assigneeId, setAssigneeId] = useState('');

  return (
    // No divider here — the Executive Decisions block below owns the rule.
    <div className="pt-6">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
        Assign Investigator
      </p>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <UserSelector
            value={assigneeId}
            onChange={setAssigneeId}
            disabled={isAssigning}
            placeholder="Search a user to assign this report"
          />
        </div>
        <Button
          onClick={() => onAssign(assigneeId)}
          disabled={!assigneeId || isAssigning}
          variant="outline"
        >
          <UserCheck className="w-4 h-4 mr-1.5" />
          {isAssigning ? 'Assigning...' : 'Assign'}
        </Button>
      </div>
    </div>
  );
}

export function ReportDetailSection({
  report,
  canManageReports,
  isAssigning,
  onUpdateStatus,
  onTakeAction,
  onAssign,
  onClose,
}: ReportDetailSectionProps) {
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<ReportAction>('warn');
  const [actionNote, setActionNote] = useState('');

  if (!report) return null;

  const handleOpenActionModal = (action: ReportAction) => {
    setActionType(action);
    setShowActionModal(true);
  };

  const handleConfirmAction = () => {
    onTakeAction(actionType, actionNote);
    setShowActionModal(false);
    setActionNote('');
  };

  const isOpen = report.status === 'open';
  const isInvestigating = report.status === 'investigating';
  const isFinal = report.status === 'resolved' || report.status === 'dismissed';

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
                  {report.reporterUser?.nickname || 'Anonymous'}
                </p>
                <Badge variant="outline" className="text-[10px] py-0">
                  {report.reporterUserId.slice(0, 8)}
                </Badge>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-red-500">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block mb-1">
                Target (Reported)
              </label>
              <div className="flex items-center gap-2">
                <p className="font-bold">{report.targetUser?.nickname || 'Unidentified'}</p>
                <Badge variant="outline" className="text-[10px] py-0 border-red-500/20 text-red-500">
                  {report.targetUserId.slice(0, 8)}
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
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] py-0 uppercase">
                  {report.category}
                </Badge>
                <Badge variant={statusColors[report.status]}>{report.status}</Badge>
              </div>
            </div>
            <div className="p-6 rounded-3xl bg-gray-900 text-gray-100 font-mono text-sm leading-relaxed border border-primary/10 shadow-inner">
              {report.description || <span className="text-gray-500">No description was provided with this report.</span>}
            </div>
          </div>

          {canManageReports && (
            <AssignPanel key={report.id} isAssigning={isAssigning} onAssign={onAssign} />
          )}

          <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 block">
              Executive Decisions
            </label>
            <div className="flex flex-wrap gap-2">
              {canManageReports && isOpen && (
                <>
                  <Button size="sm" onClick={() => onUpdateStatus('investigating')} className="bg-primary hover:bg-primary/90">
                    Initiate Investigation
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-900"
                    onClick={() => handleOpenActionModal('sanction')}
                  >
                    <Ban className="w-4 h-4 mr-1.5" />
                    Instant Sanction
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleOpenActionModal('escalate')}>
                    Escalate
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onUpdateStatus('dismissed')}>
                    Dismiss Intel
                  </Button>
                </>
              )}

              {canManageReports && isInvestigating && (
                <>
                  <Button size="sm" onClick={() => onUpdateStatus('resolved')} className="bg-emerald-600 hover:bg-emerald-700">
                    Finalize &amp; Resolve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleOpenActionModal('warn')}>
                    Issue Warning
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-900"
                    onClick={() => handleOpenActionModal('sanction')}
                  >
                    <Ban className="w-4 h-4 mr-1.5" />
                    Instant Sanction
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onUpdateStatus('dismissed')}>
                    False Alarm
                  </Button>
                </>
              )}

              {isFinal && (
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
            value={actionNote}
            onChange={(e) => setActionNote(e.target.value)}
            placeholder="State the reason for this decision..."
            className="bg-transparent"
          />

          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={handleConfirmAction}
              disabled={!actionNote}
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
