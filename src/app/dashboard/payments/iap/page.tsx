'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Plus, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Badge } from '@/shared/components/ui/Badge';
import { QueryState } from '@/shared/components/ui/QueryState';
import { useHasPermission } from '@/hooks/usePermissions';
import iapService, { type IapProductMapping } from '@/services/iap.service';
import { formatIntegerString, sanitizeIntegerInput } from '@/shared/lib/money';
import { ItemBadgePicker } from '@/shared/components/rewards/ItemBadgePicker';
import { StoreBundlePicker } from '@/shared/components/rewards/StoreBundlePicker';

const PAGE_LIMIT = 20;

/**
 * §38 IAP product mappings — bind a Google Play / Apple product to a
 * canonical grant: GAME_CURRENCY amount, Store ITEM, or Store BUNDLE.
 * Verification never trusts client-supplied amounts; these mappings are the
 * only grant authority.
 */
export default function IapProductsPage() {
  const queryClient = useQueryClient();
  const hasPermission = useHasPermission();
  const canRead = hasPermission('iap.read');
  const canWrite = hasPermission('iap.execute');

  const [providerFilter, setProviderFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    provider: 'google_play' as 'google_play' | 'apple_app_store',
    applicationId: '',
    providerProductId: '',
    grantType: 'GAME_CURRENCY' as 'GAME_CURRENCY' | 'ITEM' | 'BUNDLE',
    grantAmount: '',
    grantReference: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['iap-products', providerFilter, activeFilter, page],
    queryFn: () =>
      iapService.listProducts({
        provider: providerFilter || undefined,
        active: activeFilter ? activeFilter === 'active' : undefined,
        page,
        limit: PAGE_LIMIT,
      }),
    enabled: canRead,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['iap-products'] });

  const createProduct = async () => {
    setFormError(null);
    if (!form.applicationId.trim() || !form.providerProductId.trim()) {
      setFormError('Application ID and provider product ID are required.');
      return;
    }
    if (form.grantType === 'GAME_CURRENCY' && !/^[1-9][0-9]*$/.test(form.grantAmount)) {
      setFormError('GAME_CURRENCY grant must be a positive integer.');
      return;
    }
    if (form.grantType !== 'GAME_CURRENCY' && !form.grantReference) {
      setFormError(`A canonical Store ${form.grantType === 'ITEM' ? 'Item' : 'Bundle'} is required.`);
      return;
    }
    setSaving(true);
    try {
      await iapService.createProduct({
        provider: form.provider,
        applicationId: form.applicationId.trim(),
        providerProductId: form.providerProductId.trim(),
        grantType: form.grantType,
        grantAmount: form.grantType === 'GAME_CURRENCY' ? form.grantAmount.trim() : undefined,
        grantReference: form.grantType === 'GAME_CURRENCY' ? null : form.grantReference.trim(),
      });
      setShowCreate(false);
      setForm({ provider: 'google_play', applicationId: '', providerProductId: '', grantType: 'GAME_CURRENCY', grantAmount: '', grantReference: '' });
      invalidate();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to create mapping');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (mapping: IapProductMapping) => {
    setFormError(null);
    setSaving(true);
    try {
      await iapService.updateProduct(mapping.id, { active: !mapping.active });
      invalidate();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to update mapping status.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="IAP Product Mappings"
        description="Google Play / Apple product bindings. Grant targets: GAME_CURRENCY amount, Store Item, or Store Bundle."
        icon={<CreditCard className="w-5 h-5" />}
        action={canWrite ? { label: 'Create Mapping', onClick: () => setShowCreate((s) => !s), icon: <Plus className="w-4 h-4" /> } : undefined}
      />

      {!canRead ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-500">
          You do not have <code>iap.read</code>.
        </div>
      ) : (
        <>
          {!canWrite && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
              Read-only IAP product mappings. <code>iap.execute</code> is required to create or change a mapping.
            </div>
          )}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
            This API exposes product-to-entitlement mappings only. Provider prices, receipt validation results, purchase reconciliation, and provider environment metadata are not available through the current IAP admin controller.
          </div>
          {showCreate && canWrite && (
            <Card>
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-sm font-bold">New Product Mapping</CardTitle>
              </CardHeader>
              <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select
                  value={form.provider}
                  onChange={(e) => setForm({ ...form, provider: e.target.value as 'google_play' | 'apple_app_store' })}
                  options={[{ value: 'google_play', label: 'Google Play' }, { value: 'apple_app_store', label: 'Apple App Store' }]}
                />
                <Input placeholder="Application ID (e.g. com.viora.game)" value={form.applicationId} onChange={(e) => setForm({ ...form, applicationId: e.target.value })} />
                <Input placeholder="Provider product ID" value={form.providerProductId} onChange={(e) => setForm({ ...form, providerProductId: e.target.value })} />
                <Select
                  value={form.grantType}
                  onChange={(e) => setForm({ ...form, grantType: e.target.value as 'GAME_CURRENCY' | 'ITEM' | 'BUNDLE', grantReference: '' })}
                  options={[{ value: 'GAME_CURRENCY', label: 'GAME_CURRENCY' }, { value: 'ITEM', label: 'Store Item' }, { value: 'BUNDLE', label: 'Store Bundle' }]}
                />
                {form.grantType === 'GAME_CURRENCY' ? (
                  <Input
                    placeholder="Grant amount"
                    inputMode="numeric"
                    value={form.grantAmount}
                    onChange={(e) => setForm({ ...form, grantAmount: sanitizeIntegerInput(e.target.value) })}
                  />
                ) : (
                  <div>
                    {form.grantType === 'ITEM' ? (
                      <ItemBadgePicker value={form.grantReference} onChange={(id) => setForm({ ...form, grantReference: id })} />
                    ) : (
                      <StoreBundlePicker value={form.grantReference} onChange={(id) => setForm({ ...form, grantReference: id })} />
                    )}
                    {form.grantReference && <p className="mt-1 text-[11px] text-gray-400">ID: {form.grantReference}</p>}
                  </div>
                )}
                {formError && <p className="text-sm text-red-600 md:col-span-3">{formError}</p>}
                <div className="md:col-span-3 flex gap-2">
                  <Button onClick={createProduct} disabled={saving}>{saving ? 'Saving…' : 'Create'}</Button>
                  <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="p-4 pb-0">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  Mappings {data && <Badge variant="outline">{data.total} total</Badge>}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select
                    value={providerFilter}
                    onChange={(e) => { setProviderFilter(e.target.value); setPage(1); }}
                    className="w-44"
                    options={[{ value: '', label: 'All providers' }, { value: 'google_play', label: 'Google Play' }, { value: 'apple_app_store', label: 'Apple App Store' }]}
                  />
                  <Select
                    value={activeFilter}
                    onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
                    className="w-36"
                    options={[{ value: '', label: 'All statuses' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
                  />
                  <Button size="sm" variant="outline" onClick={() => refetch()}><RefreshCw className="w-4 h-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <QueryState
                isLoading={isLoading}
                isError={isError}
                error={error}
                isEmpty={!data || data.mappings.length === 0}
                emptyMessage="No IAP product mappings yet."
                onRetry={() => refetch()}
              >
                {data && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs text-gray-500 uppercase">
                        <tr>
                          <th className="py-2 pr-3">Provider</th>
                          <th className="py-2 pr-3">Product</th>
                          <th className="py-2 pr-3">Grant</th>
                          <th className="py-2 pr-3">Status</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {data.mappings.map((mapping) => (
                          <tr key={mapping.id}>
                            <td className="py-2 pr-3"><Badge variant="outline">{mapping.provider}</Badge></td>
                            <td className="py-2 pr-3">
                              <p className="font-medium">{mapping.providerProductId}</p>
                              <p className="font-mono text-[10px] text-gray-400">{mapping.applicationId}</p>
                            </td>
                            <td className="py-2 pr-3 text-xs">
                              {mapping.grantType === 'GAME_CURRENCY'
                                ? `${formatIntegerString(mapping.grantAmount)} GAME_CURRENCY`
                                : `${mapping.grantType} ${mapping.grantReference?.slice(0, 8)}…`}
                            </td>
                            <td className="py-2 pr-3">
                              <Badge variant={mapping.active ? 'success' : 'danger'}>{mapping.active ? 'Active' : 'Inactive'}</Badge>
                            </td>
                            <td className="py-2 text-right">
                              {canWrite && (
                                <Button size="sm" variant="outline" disabled={saving} onClick={() => toggleActive(mapping)}>
                                  {mapping.active ? 'Deactivate' : 'Activate'}
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                      <span>Page {data.page} — {data.total} total</span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
                        <Button size="sm" variant="outline" disabled={page * PAGE_LIMIT >= data.total} onClick={() => setPage((p) => p + 1)}>Next</Button>
                      </div>
                    </div>
                  </div>
                )}
              </QueryState>
              {formError && !showCreate && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{formError}</p>}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
