'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, RefreshCw, AlertTriangle, Info, ShieldQuestion } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { QueryState } from '@/shared/components/ui/QueryState';
import { useHasPermission } from '@/hooks/usePermissions';
import { useToast } from '@/store/toast.store';
import reconciliationService, { type FindingSeverity } from '@/services/reconciliation.service';
import { humanizeToken } from '@/shared/lib/labels';
import { CopyId } from '@/shared/components/ui/UserIdentityCell';

const SEVERITY_BADGE: Record<FindingSeverity, 'danger' | 'warning' | 'default'> = {
  critical: 'danger', warning: 'warning', info: 'default',
};
const SEVERITY_ICON: Record<FindingSeverity, typeof AlertTriangle> = {
  critical: AlertTriangle, warning: ShieldQuestion, info: Info,
};

/**
 * Financial Reconciliation — admin/financial-reconciliation
 * (modules/reconciliation/reconciliation.controller.ts). Read-only findings
 * feed (GET .../findings, reports.read) plus a manual on-demand run trigger
 * (POST .../run, requires BOTH reports.execute AND financial.execute — the
 * backend also runs this automatically every hour via Cron). There is no
 * acknowledge/resolve/false-positive-mark admin endpoint on the backend —
 * findings only transition to `resolved` automatically when a later run no
 * longer detects the underlying condition, so this page is intentionally
 * read-plus-run only, not a full triage workflow.
 */
export default function ReconciliationPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const hasPermission = useHasPermission();
  const canRead = hasPermission('reports.read');
  const canRun = hasPermission('reports.execute') && hasPermission('financial.execute');

  const [limit] = useState(200);
  const { data: findings, isLoading, isError, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['reconciliation-findings', limit],
    queryFn: () => reconciliationService.listFindings(limit),
    enabled: canRead,
    refetchInterval: 60_000,
  });

  const runMutation = useMutation({
    mutationFn: () => reconciliationService.run(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-findings'] });
      toast.success(`Run complete — ${result.checks} checks, ${result.open} open, ${result.resolved} resolved.`);
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Reconciliation run failed.'),
  });

  const criticalCount = findings?.filter((f) => f.severity === 'critical').length ?? 0;
  const warningCount = findings?.filter((f) => f.severity === 'warning').length ?? 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Financial Reconciliation"
        description="Ledger/wallet integrity invariant findings — a scheduled backend job (hourly) plus manual on-demand runs."
        icon={<ShieldAlert className="w-5 h-5" />}
        action={canRun ? { label: runMutation.isPending ? 'Running…' : 'Run now', onClick: () => runMutation.mutate(), icon: <RefreshCw className={`w-4 h-4 ${runMutation.isPending ? 'animate-spin' : ''}`} /> } : undefined}
      />

      {!canRead ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-500">
          You do not have <code>reports.read</code>.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card><CardContent className="p-4">
              <p className="text-xs text-gray-500 uppercase">Open findings</p>
              <p className="text-2xl font-bold">{findings ? findings.length : '—'}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-gray-500 uppercase">Critical</p>
              <p className="text-2xl font-bold text-red-500">{findings ? criticalCount : '—'}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-gray-500 uppercase">Warning</p>
              <p className="text-2xl font-bold text-amber-500">{findings ? warningCount : '—'}</p>
            </CardContent></Card>
          </div>

          <Card padding="none">
            <CardHeader className="p-4 pb-0 flex items-center justify-between">
              <CardTitle className="text-sm font-bold">Open findings</CardTitle>
              {dataUpdatedAt > 0 && <span className="text-xs text-gray-400">Updated {new Date(dataUpdatedAt).toLocaleTimeString()}</span>}
            </CardHeader>
            <CardContent className="p-4">
              <QueryState
                isLoading={isLoading}
                isError={isError}
                error={error}
                allowed={canRead}
                requiredPermission="reports.read"
                isEmpty={!findings || findings.length === 0}
                emptyMessage="No open findings — all invariant checks passing."
                loadingMessage="Loading findings…"
                onRetry={() => void refetch()}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="py-2 pr-3">Severity</th><th className="py-2 pr-3">Check</th>
                        <th className="py-2 pr-3">Subject</th><th className="py-2 pr-3">Evidence</th><th className="py-2 pr-3">Detected</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {(findings ?? []).map((f) => {
                        const Icon = SEVERITY_ICON[f.severity];
                        return (
                          <tr key={f.id}>
                            <td className="py-2 pr-3">
                              <Badge variant={SEVERITY_BADGE[f.severity]}><Icon className="w-3 h-3 mr-1 inline" />{humanizeToken(f.severity)}</Badge>
                            </td>
                            <td className="py-2 pr-3 text-xs" title={f.checkType}>{humanizeToken(f.checkType)}</td>
                            <td className="py-2 pr-3 text-xs">
                              <span className="text-gray-500">{humanizeToken(f.subjectType)}</span>{' '}
                              <CopyId id={f.subjectId} />
                            </td>
                            <td className="py-2 pr-3">
                              <pre className="text-xs bg-gray-50 dark:bg-gray-800 rounded p-1.5 max-w-xs overflow-x-auto">{JSON.stringify(f.evidence, null, 0)}</pre>
                            </td>
                            <td className="py-2 pr-3 text-xs text-gray-500 whitespace-nowrap">{new Date(f.detectedAt).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </QueryState>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
