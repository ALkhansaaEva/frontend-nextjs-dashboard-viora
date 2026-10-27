import apiClient from '@/lib/api/api-client';

/**
 * Financial Reconciliation — modules/reconciliation/reconciliation.controller.ts
 * (`admin/financial-reconciliation`). Runs a fixed battery of SQL invariant
 * checks (ledger tail balance, wallet/account projection parity, unbalanced
 * ledger operations, IAP/agent-transfer/agent-topup/distributor-allocation/
 * agent-sale/agent-cashout ledger completeness, duplicate progress receipts,
 * missing item-reward inventory rows) and persists open findings. There is a
 * scheduled Cron run on the backend (hourly, `0 17 * * * *`) plus this
 * manual `run` trigger for on-demand execution.
 */
export type FindingSeverity = 'info' | 'warning' | 'critical';
export type FindingStatus = 'open' | 'acknowledged' | 'resolved' | 'false_positive';

export interface ReconciliationFinding {
  id: string;
  checkType: string;
  subjectType: string;
  subjectId: string;
  severity: FindingSeverity;
  evidence: Record<string, unknown>;
  status: FindingStatus;
  detectedAt: string;
  resolvedAt: string | null;
  resolutionAuditId: string | null;
}

export interface ReconciliationRunResult {
  checks: number;
  open: number;
  resolved: number;
}

export const reconciliationService = {
  /** GET admin/financial-reconciliation/findings — requires reports.read. */
  async listFindings(limit = 100): Promise<ReconciliationFinding[]> {
    return apiClient.get<ReconciliationFinding[]>('/admin/financial-reconciliation/findings', { params: { limit } });
  },
  /** POST admin/financial-reconciliation/run — requires reports.execute AND financial.execute. */
  async run(): Promise<ReconciliationRunResult> {
    return apiClient.post<ReconciliationRunResult>('/admin/financial-reconciliation/run', {});
  },
};

export default reconciliationService;
