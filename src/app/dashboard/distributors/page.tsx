'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Landmark, Plus, Loader2, Percent, Coins, RefreshCw, Users } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { QueryState } from '@/shared/components/ui/QueryState';
import { useToast } from '@/store/toast.store';
import { useHasPermission } from '@/hooks/usePermissions';
import distributionService from '@/services/distribution.service';
import agentsService from '@/services/agents.service';
import { UserSelector } from '@/shared/components/ui/UserSelector';
import { UserIdentityCell, CopyId } from '@/shared/components/ui/UserIdentityCell';
import { isPositiveIntegerString } from '@/shared/lib/money';
import type { DistributionStatus, ExchangeRateType, ExchangeRoundingRule } from '@/types/agents';

const RATE_TYPES: ExchangeRateType[] = ['providerPurchaseRate', 'distributorSellRate', 'agentCustomerSellRate', 'customerCashoutRate'];
const ROUNDING_RULES: ExchangeRoundingRule[] = ['FLOOR', 'CEIL', 'HALF_UP'];
const STATUS_BADGE: Record<DistributionStatus, 'default' | 'success' | 'warning' | 'danger'> = {
  pending: 'default', active: 'success', suspended: 'warning', closed: 'danger',
};
const LIST_LIMIT = 20;

export default function DistributorsAdminPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const canRead = useHasPermission()('agents.read');
  const canWrite = useHasPermission()('agents.write');
  const canFinance = useHasPermission()('financial.execute');
  const canCommission = useHasPermission()('commissions.write');

  // ── Durable catalog (GET /admin/distribution/distributors) — no session-local authority. ──
  const [statusFilter, setStatusFilter] = useState<DistributionStatus | ''>('');
  const [offset, setOffset] = useState(0);
  const listQueryKey = ['distributors', statusFilter, offset] as const;
  const {
    data: list, isLoading: listLoading, isFetching: listFetching,
    isError: listIsError, error: listError, refetch: refetchList,
  } = useQuery({
    queryKey: listQueryKey,
    queryFn: () => distributionService.listDistributors({ status: statusFilter || undefined, limit: LIST_LIMIT, offset }),
    enabled: canRead,
  });
  const invalidateList = () => queryClient.invalidateQueries({ queryKey: ['distributors'] });

  const [detailId, setDetailId] = useState<string | null>(null);
  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['distributor-detail', detailId],
    queryFn: () => distributionService.getDistributorById(detailId!),
    enabled: !!detailId,
  });
  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['distributor-agents', detailId],
    queryFn: () => distributionService.listDistributorAgents(detailId!),
    enabled: !!detailId,
  });

  const [newUserId, setNewUserId] = useState('');
  const createMutation = useMutation({
    mutationFn: () => distributionService.createDistributor({ userId: newUserId }),
    onSuccess: () => { invalidateList(); toast.success('Distributor created.'); setNewUserId(''); },
    onError: (err) => toast.error('Failed to create distributor.', err),
  });

  // ── Actions operate on the OPEN distributor (detailId) — no manual ID entry. ──
  const { data: agentsList } = useQuery({ queryKey: ['agents'], queryFn: () => agentsService.list(), enabled: !!detailId });

  const [status, setStatus] = useState<DistributionStatus>('active');
  const statusMutation = useMutation({
    mutationFn: () => distributionService.setStatus(detailId!, status as 'active' | 'suspended' | 'closed'),
    onSuccess: () => {
      invalidateList();
      queryClient.invalidateQueries({ queryKey: ['distributor-detail', detailId] });
      toast.success('Distributor status updated.');
    },
    onError: (err) => toast.error('Status update failed.', err),
  });

  const [assignAgentId, setAssignAgentId] = useState('');
  const assignMutation = useMutation({
    mutationFn: () => distributionService.assignAgent(detailId!, assignAgentId),
    onSuccess: () => {
      toast.success('Agent assigned to distributor.');
      setAssignAgentId('');
      queryClient.invalidateQueries({ queryKey: ['distributor-agents', detailId] });
    },
    onError: (err) => toast.error('Assignment failed.', err),
  });

  const [fundAmount, setFundAmount] = useState('');
  const fundMutation = useMutation({
    mutationFn: () => distributionService.fundDistributor(detailId!, fundAmount, crypto.randomUUID()),
    onSuccess: () => { toast.success('Distributor funded.'); setFundAmount(''); },
    onError: (err) => toast.error('Funding failed.', err),
  });

  // Rate policy
  const { data: ratePolicies, isLoading: ratesLoading, isError: ratesError, refetch: refetchRates } = useQuery({
    queryKey: ['distribution-rates'],
    queryFn: () => distributionService.listRatePolicies(),
    enabled: canRead,
  });
  const [rateType, setRateType] = useState<ExchangeRateType>('providerPurchaseRate');
  const [rateVersion, setRateVersion] = useState(1);
  const [fiatCurrency, setFiatCurrency] = useState('USD');
  const [gameCurrencyUnits, setGameCurrencyUnits] = useState('');
  const [fiatMinorUnits, setFiatMinorUnits] = useState('');
  const [roundingRule, setRoundingRule] = useState<ExchangeRoundingRule>('HALF_UP');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [rateResult, setRateResult] = useState<{ id: string } | null>(null);
  // Backend contract: version >= 1, fiatCurrency is a 3-letter ISO code, and
  // both unit fields are positive integer strings (`^[1-9][0-9]*$`).
  const rateFormValid =
    Number.isInteger(rateVersion) && rateVersion >= 1 &&
    /^[A-Z]{3}$/.test(fiatCurrency) &&
    /^[1-9][0-9]*$/.test(gameCurrencyUnits) &&
    /^[1-9][0-9]*$/.test(fiatMinorUnits);
  const createRateMutation = useMutation({
    mutationFn: () => distributionService.createRatePolicy({
      rateType, version: rateVersion, fiatCurrency, gameCurrencyUnits, fiatMinorUnits,
      roundingRule, effectiveFrom: effectiveFrom || new Date().toISOString(),
    }),
    onSuccess: (policy) => { setRateResult({ id: policy.id }); void refetchRates(); toast.success('Draft rate policy created.'); },
    onError: (err) => toast.error('Failed to create rate policy.', err),
  });
  const approveRateMutation = useMutation({
    mutationFn: (id: string) => distributionService.approveRatePolicy(id),
    onSuccess: () => { void refetchRates(); toast.success('Rate policy approved and active.'); },
    onError: (err) => toast.error('Approval failed.', err),
  });

  if (!canRead) {
    return <div className="p-6 text-sm text-gray-500">You do not have <code>agents.read</code> — this page is unavailable.</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader title="Distributors" description="Master Distributors — Platform → Distributor → Agent → Player hierarchy" icon={<Landmark className="w-5 h-5" />} />

      {canWrite && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-bold">Create Distributor</CardTitle></CardHeader>
          <CardContent className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User</label>
              <UserSelector value={newUserId} onChange={setNewUserId} />
            </div>
            <Button disabled={!newUserId || createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />} Create
            </Button>
          </CardContent>
        </Card>
      )}

      <Card padding="none">
        <CardHeader className="p-4 pb-0">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              Distributor Catalog {list && <Badge variant="outline">{list.total} total</Badge>}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as DistributionStatus | ''); setOffset(0); }}
                options={[{ value: '', label: 'All statuses' }, { value: 'pending', label: 'pending' }, { value: 'active', label: 'active' }, { value: 'suspended', label: 'suspended' }, { value: 'closed', label: 'closed' }]} />
              <Button size="sm" variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: listQueryKey })} disabled={listFetching}>
                <RefreshCw className={`w-3.5 h-3.5 ${listFetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <QueryState
            isLoading={listLoading}
            isError={listIsError}
            error={listError}
            allowed={canRead}
            requiredPermission="agents.read"
            isEmpty={!list || list.items.length === 0}
            emptyMessage="No distributors match this filter yet."
            loadingMessage="Loading catalog…"
            onRetry={() => void refetchList()}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-gray-500 uppercase">
                  <tr><th className="py-2 pr-3">Distributor</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Created</th><th /></tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(list?.items ?? []).map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer" onClick={() => setDetailId(d.id)}>
                      <td className="py-2 pr-3">
                        <UserIdentityCell userId={d.userId} />
                        <CopyId id={d.id} label="Distributor" />
                      </td>
                      <td className="py-2 pr-3"><Badge variant={STATUS_BADGE[d.status]}>{d.status}</Badge></td>
                      <td className="py-2 pr-3 text-gray-500">{new Date(d.createdAt).toLocaleDateString()}</td>
                      <td className="py-2 text-right">
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setDetailId(d.id); }}>Open</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                <span>{offset + 1}–{Math.min(offset + LIST_LIMIT, list?.total ?? 0)} of {list?.total ?? 0}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - LIST_LIMIT))}>Prev</Button>
                  <Button size="sm" variant="outline" disabled={offset + LIST_LIMIT >= (list?.total ?? 0)} onClick={() => setOffset((o) => o + LIST_LIMIT)}>Next</Button>
                </div>
              </div>
            </div>
          </QueryState>
        </CardContent>
      </Card>

      <p className="text-xs text-gray-400">Status, agent assignment and funding actions live on each distributor&apos;s detail view — open a row above.</p>

      <Card padding="none">
        <CardHeader className="p-4 pb-0">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Percent className="w-4 h-4" /> Exchange Rate Policy
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => void refetchRates()} disabled={ratesLoading}>
              <RefreshCw className={`w-3.5 h-3.5 ${ratesLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {canCommission && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Select label="Rate type" value={rateType} onChange={(e) => setRateType(e.target.value as ExchangeRateType)}
                  options={RATE_TYPES.map((t) => ({ value: t, label: t }))} />
                <Input label="Version" type="number" min={1} value={rateVersion} onChange={(e) => setRateVersion(Number(e.target.value))} />
                <Input label="Fiat currency (ISO 3)" value={fiatCurrency} onChange={(e) => setFiatCurrency(e.target.value.toUpperCase().slice(0, 3))} />
                <Input label="Game currency units" value={gameCurrencyUnits} onChange={(e) => setGameCurrencyUnits(e.target.value.replace(/[^0-9]/g, ''))} />
                <Input label="Fiat minor units" value={fiatMinorUnits} onChange={(e) => setFiatMinorUnits(e.target.value.replace(/[^0-9]/g, ''))} />
                <Select label="Rounding rule" value={roundingRule} onChange={(e) => setRoundingRule(e.target.value as ExchangeRoundingRule)}
                  options={ROUNDING_RULES.map((r) => ({ value: r, label: r }))} />
                <Input label="Effective from (ISO datetime)" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} placeholder={new Date().toISOString()} />
              </div>
              <Button disabled={!rateFormValid || createRateMutation.isPending} onClick={() => createRateMutation.mutate()}>
                {createRateMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Create draft rate policy
              </Button>
              {rateResult && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Draft id: <code>{rateResult.id}</code></span>
                  {/* Approval moves money: financial.execute, not commissions.write. */}
                  {canFinance ? (
                    <Button size="sm" variant="outline" disabled={approveRateMutation.isPending} onClick={() => approveRateMutation.mutate(rateResult.id)}>
                      Approve
                    </Button>
                  ) : (
                    <span className="text-xs text-gray-400">Approve requires <code>financial.execute</code>.</span>
                  )}
                </div>
              )}
            </div>
          )}

          <QueryState
            isLoading={ratesLoading}
            isError={ratesError}
            error={ratesError}
            isEmpty={!ratePolicies || ratePolicies.length === 0}
            emptyMessage="No exchange rate policies yet."
            onRetry={() => void refetchRates()}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="py-2 pr-3">Rate type</th><th className="py-2 pr-3">v</th>
                    <th className="py-2 pr-3">Fiat</th><th className="py-2 pr-3">Game units</th>
                    <th className="py-2 pr-3">Minor units</th><th className="py-2 pr-3">Rounding</th>
                    <th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Effective from</th><th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(ratePolicies ?? []).map((policy) => (
                    <tr key={policy.id}>
                      <td className="py-2 pr-3">{policy.rateType}</td>
                      <td className="py-2 pr-3">{policy.version}</td>
                      <td className="py-2 pr-3">{policy.fiatCurrency}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{policy.gameCurrencyUnits}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{policy.fiatMinorUnits}</td>
                      <td className="py-2 pr-3">{policy.roundingRule}</td>
                      <td className="py-2 pr-3"><Badge variant={policy.status === 'active' ? 'success' : 'default'}>{policy.status}</Badge></td>
                      <td className="py-2 pr-3 text-xs text-gray-500">{new Date(policy.effectiveFrom).toLocaleString()}</td>
                      <td className="py-2 text-right">
                        {/* Approve is guarded by financial.execute alone (financial.execute
                            moves money); it is not a commissions.write operation. */}
                        {canFinance && policy.status !== 'active' && (
                          <Button size="sm" variant="outline" disabled={approveRateMutation.isPending} onClick={() => approveRateMutation.mutate(policy.id)}>
                            Approve
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </QueryState>
        </CardContent>
      </Card>

      {/* ── Detail modal (backend readback, not local state) ── */}
      <Modal isOpen={!!detailId} onClose={() => setDetailId(null)} title="Distributor Detail" size="lg">
        {detailLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : detail ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="col-span-2">
                <span className="text-gray-500">User</span>
                <UserIdentityCell userId={detail.userId} />
              </div>
              <div><span className="text-gray-500">Status</span><p><Badge variant={STATUS_BADGE[detail.status]}>{detail.status}</Badge></p></div>
              <div><span className="text-gray-500">Distributor ID</span><CopyId id={detail.id} /></div>
              <div><span className="text-gray-500">Regions</span><p>{detail.allowedRegions.join(', ') || '—'}</p></div>
              <div><span className="text-gray-500">Capabilities</span><p>{detail.capabilities.join(', ') || '—'}</p></div>
            </div>

            {canWrite && (
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700 space-y-3">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</p>
                <div className="flex items-end gap-2">
                  <Select label="Change status" value={status} onChange={(e) => setStatus(e.target.value as DistributionStatus)}
                    options={[{ value: 'active', label: 'active' }, { value: 'suspended', label: 'suspended' }, { value: 'closed', label: 'closed' }]} className="flex-1" />
                  <Button size="sm" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate()}>Update</Button>
                </div>
                <div className="flex items-end gap-2">
                  <Select label="Assign agent" value={assignAgentId} onChange={(e) => setAssignAgentId(e.target.value)}
                    options={[{ value: '', label: 'Select an agent…' }, ...(agentsList ?? []).map((a) => ({ value: a.id, label: `${a.externalReference || a.userId.slice(0, 8)} (${a.status})` }))]}
                    className="flex-1" />
                  <Button size="sm" disabled={!assignAgentId || assignMutation.isPending} onClick={() => assignMutation.mutate()}>Assign</Button>
                </div>
                {canFinance && (
                  <div className="flex items-end gap-2">
                    <Input label="Fund amount (GAME_CURRENCY)" value={fundAmount} onChange={(e) => setFundAmount(e.target.value.replace(/[^0-9]/g, ''))} className="flex-1" />
                    {/* PositiveGameAmountDto is `^[1-9][0-9]*$` — a bare "0"/"00"
                        is truthy but would 400, so gate on the DTO's own pattern. */}
                    <Button size="sm" disabled={!isPositiveIntegerString(fundAmount) || fundMutation.isPending} onClick={() => fundMutation.mutate()}>
                      <Coins className="w-3.5 h-3.5 mr-1" /> Fund
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5"><Users className="w-4 h-4" /> Assigned Agents</p>
              {assignmentsLoading ? (
                <p className="text-xs text-gray-400">Loading…</p>
              ) : !assignments || assignments.length === 0 ? (
                <p className="text-xs text-gray-400">No agent assignments.</p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {assignments.map((a) => {
                    // assignments carry the agent PROFILE id, not a user id —
                    // resolve through the already-loaded agents list before
                    // trying (and failing) a direct /admin/users/:id lookup.
                    const agentUserId = agentsList?.find((ag) => ag.id === a.agentId)?.userId;
                    return (
                      <li key={a.id} className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 py-1">
                        {agentUserId ? <UserIdentityCell userId={agentUserId} /> : <CopyId id={a.agentId} label="Agent" />}
                        <Badge variant={a.status === 'active' ? 'success' : 'default'}>{a.status}</Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
