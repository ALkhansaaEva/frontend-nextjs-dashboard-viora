'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCog, Plus, Loader2, Coins, ArrowDownToLine, Undo2, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { QueryState } from '@/shared/components/ui/QueryState';
import { useToast } from '@/store/toast.store';
import { useHasPermission } from '@/hooks/usePermissions';
import agentsService from '@/services/agents.service';
import { UserSelector } from '@/shared/components/ui/UserSelector';
import { UserIdentityCell } from '@/shared/components/ui/UserIdentityCell';
import type { AgentProfile, AgentStatus } from '@/types/agents';

const STATUS_COLOR: Record<AgentStatus, 'default' | 'success' | 'warning' | 'danger'> = {
  pending: 'default', active: 'success', held: 'warning', suspended: 'danger', closed: 'danger',
};

type TransferKind = 'fund' | 'redeem';
const TRANSFER_META: Record<TransferKind, { label: string; icon: typeof Coins; permission: string }> = {
  fund: { label: 'Fund (Platform → Agent)', icon: Coins, permission: 'agents.execute + financial.execute' },
  redeem: { label: 'Redemption (Agent → Platform)', icon: ArrowDownToLine, permission: 'agents.execute + financial.execute' },
};

export default function AgentsAdminPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const hasPermission = useHasPermission();
  const canRead = hasPermission('agents.read');
  const canWrite = hasPermission('agents.write');
  const canExecute = hasPermission('agents.execute') && hasPermission('financial.execute');
  // Commission + limit policy routes are guarded by commissions.write, not
  // agents.write — a plain agent operator gets 403s from the policy endpoints.
  const canCommission = hasPermission('commissions.write');

  // `isError`/`error` MUST be read here. Destructuring only `data` and
  // defaulting to `[]` turns every 401/403/500/timeout into a confident
  // "No agents yet" empty state — the exact bug this page had. QueryState
  // below renders forbidden/loading/error/empty as four distinct outcomes.
  const { data: agents = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsService.list(),
    enabled: canRead,
  });

  const [showCreate, setShowCreate] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newExternalRef, setNewExternalRef] = useState('');
  const createMutation = useMutation({
    mutationFn: () => agentsService.create({ userId: newUserId, externalReference: newExternalRef || undefined }),
    onSuccess: () => {
      toast.success('Agent created.');
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setShowCreate(false); setNewUserId(''); setNewExternalRef('');
    },
    onError: (err) => toast.error('Failed to create agent.', err),
  });

  const [statusTarget, setStatusTarget] = useState<AgentProfile | null>(null);
  const [newStatus, setNewStatus] = useState<AgentStatus>('active');
  const [statusReason, setStatusReason] = useState('');
  const statusMutation = useMutation({
    mutationFn: () => agentsService.setStatus(statusTarget!.id, { status: newStatus as 'active' | 'held' | 'suspended' | 'closed', reason: statusReason || undefined }),
    onSuccess: () => {
      toast.success('Agent status updated.');
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setStatusTarget(null); setStatusReason('');
    },
    onError: (err) => toast.error('Status update failed.', err),
  });

  const [transferTarget, setTransferTarget] = useState<{ agent: AgentProfile; kind: TransferKind } | null>(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const transferMutation = useMutation({
    mutationFn: () => {
      const idempotencyKey = crypto.randomUUID();
      // The fund/redemption controllers ignore `recipientUserId`, so it is
      // deliberately not offered — an accepted-looking field that does nothing.
      const body = { amount: transferAmount };
      if (transferTarget!.kind === 'fund') return agentsService.fund(transferTarget!.agent.id, body, idempotencyKey);
      return agentsService.redeem(transferTarget!.agent.id, body, idempotencyKey);
    },
    onSuccess: () => {
      toast.success('Transfer executed.');
      setTransferTarget(null); setTransferAmount(''); setConfirmTransfer(false);
    },
    onError: (err) => toast.error('Transfer failed.', err),
  });

  const [reverseId, setReverseId] = useState('');
  const reverseMutation = useMutation({
    mutationFn: () => agentsService.reverseTransfer(reverseId, crypto.randomUUID()),
    onSuccess: () => { toast.success('Transfer reversed.'); setReverseId(''); },
    onError: (err) => toast.error('Reversal failed.', err),
  });

  // ── Commission / Limit policies ──
  const [policyVersion, setPolicyVersion] = useState('');
  const [commissionBps, setCommissionBps] = useState('');
  const [policyResult, setPolicyResult] = useState<{ id: string; kind: 'commission' | 'limit' } | null>(null);
  const commissionMutation = useMutation({
    mutationFn: () => agentsService.createCommissionPolicy({ version: policyVersion, commissionBps: commissionBps || undefined }),
    onSuccess: (res) => { const r = res as { id: string }; setPolicyResult({ id: r.id, kind: 'commission' }); toast.success('Draft commission policy created.'); },
    onError: (err) => toast.error('Failed to create commission policy.', err),
  });
  const publishPolicyMutation = useMutation({
    mutationFn: () => agentsService.publishPolicy(policyResult!.kind, policyResult!.id),
    onSuccess: () => toast.success('Policy published.'),
    onError: (err) => toast.error('Publish failed.', err),
  });

  if (!canRead) {
    return <div className="p-6 text-sm text-gray-500">You do not have <code>agents.read</code> — this page is unavailable.</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Agents" description="Currency distribution agents — accounts, transfers, and policy"
        icon={<UserCog className="w-5 h-5" />}
        action={canWrite ? { label: 'Create Agent', onClick: () => setShowCreate(true), icon: <Plus className="w-4 h-4" /> } : undefined}
      />

      <Card padding="none">
        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error}
          allowed={canRead}
          requiredPermission="agents.read"
          isEmpty={agents.length === 0}
          emptyMessage="No agents yet — create the first agent above."
          loadingMessage="Loading agents…"
          onRetry={() => void refetch()}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-left text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3">User ID</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">External Ref</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {agents.map((agent) => (
                  <tr key={agent.id}>
                    <td className="px-4 py-3"><UserIdentityCell userId={agent.userId} /></td>
                    <td className="px-4 py-3"><Badge variant={STATUS_COLOR[agent.status]}>{agent.status}</Badge></td>
                    <td className="px-4 py-3 text-gray-500">{agent.externalReference ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(agent.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {canWrite && (
                          <Button size="sm" variant="outline" onClick={() => { setStatusTarget(agent); setNewStatus(agent.status === 'active' ? 'suspended' : 'active'); }}>
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {canExecute && (['fund', 'redeem'] as TransferKind[]).map((kind) => {
                          const Icon = TRANSFER_META[kind].icon;
                          return (
                            <Button key={kind} size="sm" variant="outline" title={TRANSFER_META[kind].label} onClick={() => setTransferTarget({ agent, kind })}>
                              <Icon className="w-3.5 h-3.5" />
                            </Button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      </Card>

      {canExecute && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><Undo2 className="w-4 h-4" /> Reverse a transfer</CardTitle></CardHeader>
          <CardContent className="flex items-end gap-3">
            <Input label="Transfer ID" value={reverseId} onChange={(e) => setReverseId(e.target.value)} className="flex-1" />
            <Button variant="danger" disabled={!reverseId || reverseMutation.isPending} onClick={() => reverseMutation.mutate()}>
              {reverseMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reverse'}
            </Button>
          </CardContent>
        </Card>
      )}

      {canCommission && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold">Commission Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <Input label="Version" value={policyVersion} onChange={(e) => setPolicyVersion(e.target.value)} placeholder="e.g. v1" />
              <Input label="Commission bps (0-10000)" value={commissionBps} onChange={(e) => setCommissionBps(e.target.value.replace(/[^0-9]/g, ''))} />
              <Button disabled={!policyVersion || commissionMutation.isPending} onClick={() => commissionMutation.mutate()}>
                {commissionMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Create draft
              </Button>
            </div>
            {policyResult && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Draft id: <code>{policyResult.id}</code></span>
                {/* Publish is guarded by commissions.write server-side too. */}
                {canCommission && (
                  <Button size="sm" variant="outline" onClick={() => publishPolicyMutation.mutate()} disabled={publishPolicyMutation.isPending}>
                    Publish
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create agent modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Agent">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User</label>
            <UserSelector value={newUserId} onChange={setNewUserId} />
          </div>
          <Input label="External reference (optional)" value={newExternalRef} onChange={(e) => setNewExternalRef(e.target.value)} />
          <Button className="w-full" disabled={!newUserId || createMutation.isPending} onClick={() => createMutation.mutate()}>
            {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Create
          </Button>
        </div>
      </Modal>

      {/* Status change modal */}
      <Modal isOpen={!!statusTarget} onClose={() => setStatusTarget(null)} title="Change Agent Status">
        <div className="space-y-3">
          <Select label="New status" value={newStatus} onChange={(e) => setNewStatus(e.target.value as AgentStatus)}
            options={[{ value: 'active', label: 'active' }, { value: 'held', label: 'held' }, { value: 'suspended', label: 'suspended' }, { value: 'closed', label: 'closed' }]} />
          <Input label="Reason (optional)" value={statusReason} onChange={(e) => setStatusReason(e.target.value)} />
          <Button className="w-full" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate()}>
            {statusMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Confirm
          </Button>
        </div>
      </Modal>

      {/* Transfer modal */}
      <Modal isOpen={!!transferTarget} onClose={() => setTransferTarget(null)} title={transferTarget ? TRANSFER_META[transferTarget.kind].label : ''}>
        <div className="space-y-3">
          <p className="text-xs text-gray-400">Permission required: {transferTarget && TRANSFER_META[transferTarget.kind].permission}</p>
          <Input label="Amount (GAME_CURRENCY, positive integer)" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value.replace(/[^0-9]/g, ''))} />
          <Button className="w-full" disabled={!/^[1-9][0-9]*$/.test(transferAmount)} onClick={() => setConfirmTransfer(true)}>Review & confirm</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmTransfer}
        onOpenChange={setConfirmTransfer}
        title="Confirm financial transfer"
        message={transferTarget ? `${TRANSFER_META[transferTarget.kind].label}: ${transferAmount} GAME_CURRENCY for agent ${transferTarget.agent.id}. This calls the real backend financial command with a fresh idempotency key.` : ''}
        confirmText="Execute transfer"
        variant="warning"
        onConfirm={async () => { await transferMutation.mutateAsync(); }}
      />
    </div>
  );
}
