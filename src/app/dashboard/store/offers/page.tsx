'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tag, Plus, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Badge } from '@/shared/components/ui/Badge';
import { QueryState } from '@/shared/components/ui/QueryState';
import { useHasPermission } from '@/hooks/usePermissions';
import { useToast } from '@/store/toast.store';
import storeOffersService, { type StoreOffer } from '@/services/store-offers.service';
import { ItemBadgePicker } from '@/shared/components/rewards/ItemBadgePicker';
import { StoreBundlePicker } from '@/shared/components/rewards/StoreBundlePicker';

const PAGE_LIMIT = 20;

/**
 * §37 Store Offers — first-class discount domain. Offers override the runtime
 * price of a Store Item/Bundle; the purchase receipt snapshots basePrice,
 * finalPrice and appliedOfferId on the backend.
 */
export default function StoreOffersPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const hasPermission = useHasPermission();
  const canRead = hasPermission('store.catalog_read');
  const canWrite = hasPermission('store.catalog_manage');

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '',
    targetType: 'ITEM' as 'ITEM' | 'BUNDLE',
    targetId: '',
    offerPriceGameCurrency: '',
    startsAt: '',
    endsAt: '',
    description: '',
    eligibleRegions: '',
    purchaseLimit: '',
    displayPriority: '',
    visualAsset: '',
    active: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['store-offers', search, activeFilter, page],
    queryFn: () =>
      storeOffersService.list({
        search: search.trim() || undefined,
        active: activeFilter === '' ? undefined : activeFilter === 'true',
        page,
        limit: PAGE_LIMIT,
      }),
    enabled: canRead,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['store-offers'] });

  const EMPTY_FORM = {
    title: '', targetType: 'ITEM' as const, targetId: '', offerPriceGameCurrency: '',
    startsAt: '', endsAt: '', description: '', eligibleRegions: '', purchaseLimit: '',
    displayPriority: '', visualAsset: '', active: true,
  };

  // `startsAt < endsAt` is a hard backend invariant (store-offer.service.ts throws
  // otherwise), so the Create button stays disabled until both dates are valid.
  const windowInvalid =
    !form.startsAt || !form.endsAt ||
    new Date(form.startsAt).getTime() >= new Date(form.endsAt).getTime();
  const canCreate =
    form.title.trim().length > 0 &&
    form.title.trim().length <= 160 &&
    /^[1-9][0-9]*$/.test(form.offerPriceGameCurrency.trim()) &&
    !!form.targetId.trim() &&
    !windowInvalid;

  const createOffer = async () => {
    setFormError(null);
    setSaving(true);
    try {
      await storeOffersService.create({
        title: form.title.trim(),
        targetType: form.targetType,
        targetId: form.targetId.trim(),
        offerPriceGameCurrency: form.offerPriceGameCurrency.trim(),
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        active: form.active,
        // Backend trims/uppercases/filters these; only send what was typed so
        // omitted fields keep their defaults instead of being blanked.
        ...(form.description.trim() ? { description: form.description.trim() } : {}),
        ...(form.eligibleRegions.trim()
          ? { eligibleRegions: form.eligibleRegions.split(',').map((r) => r.trim()).filter(Boolean) }
          : {}),
        ...(form.purchaseLimit.trim() ? { purchaseLimit: Number(form.purchaseLimit) } : {}),
        ...(form.displayPriority.trim() ? { displayPriority: Number(form.displayPriority) } : {}),
        ...(form.visualAsset.trim() ? { visualAsset: form.visualAsset.trim() } : {}),
      });
      setShowCreate(false);
      setForm(EMPTY_FORM);
      invalidate();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to create offer');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (offer: StoreOffer) => {
    try {
      await storeOffersService.update(offer.id, { active: !offer.active });
      invalidate();
    } catch (e) {
      // An unhandled rejection here silently left the row showing the stale badge.
      toast.error(e instanceof Error ? e.message : `Failed to ${offer.active ? 'deactivate' : 'activate'} offer.`);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Store Offers"
        description="Time-boxed price overrides for Store Items and Bundles. Runtime pricing resolves the best active offer; receipts snapshot the applied offer."
        icon={<Tag className="w-5 h-5" />}
        action={canWrite ? { label: 'Create Offer', onClick: () => setShowCreate((s) => !s), icon: <Plus className="w-4 h-4" /> } : undefined}
      />

      {!canRead ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-500">
          You do not have <code>store.catalog_read</code>.
        </div>
      ) : (
        <>
          {showCreate && canWrite && (
            <Card>
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-sm font-bold">New Offer</CardTitle>
              </CardHeader>
              <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input label="Title *" placeholder="Required, max 160" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <Select
                  label="Target type *"
                  value={form.targetType}
                  onChange={(e) => setForm({ ...form, targetType: e.target.value as 'ITEM' | 'BUNDLE', targetId: '' })}
                  options={[{ value: 'ITEM', label: 'Item' }, { value: 'BUNDLE', label: 'Bundle' }]}
                />
                <div>
                  {form.targetType === 'ITEM' ? (
                    <ItemBadgePicker value={form.targetId} onChange={(id) => setForm({ ...form, targetId: id })} />
                  ) : (
                    <StoreBundlePicker value={form.targetId} onChange={(id) => setForm({ ...form, targetId: id })} />
                  )}
                  <p className="mt-1 text-[11px] text-gray-400">ID: {form.targetId || 'none selected'}</p>
                </div>
                <Input
                  label="Offer price (GAME_CURRENCY) *"
                  placeholder="Positive integer, lower than base price"
                  value={form.offerPriceGameCurrency}
                  onChange={(e) => setForm({ ...form, offerPriceGameCurrency: e.target.value.replace(/[^0-9]/g, '') })}
                />
                <Input
                  label="Starts at *"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                />
                <Input
                  label="Ends at *"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                  error={windowInvalid && form.startsAt && form.endsAt ? 'Must be after the start date.' : undefined}
                />
                <Input label="Description (optional, max 500)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <Input label="Eligible regions (optional)" placeholder="Comma-separated 2-letter codes, e.g. SA, EG" value={form.eligibleRegions} onChange={(e) => setForm({ ...form, eligibleRegions: e.target.value })} />
                <Input label="Purchase limit (optional)" type="number" min={1} value={form.purchaseLimit} onChange={(e) => setForm({ ...form, purchaseLimit: e.target.value })} />
                <Input label="Display priority (optional)" type="number" value={form.displayPriority} onChange={(e) => setForm({ ...form, displayPriority: e.target.value })} />
                <Input label="Visual asset URL (optional, max 500)" value={form.visualAsset} onChange={(e) => setForm({ ...form, visualAsset: e.target.value })} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                  Active immediately
                </label>
                {formError && <p className="text-sm text-red-600 md:col-span-3">{formError}</p>}
                <div className="md:col-span-3 flex items-center gap-2">
                  <Button onClick={createOffer} disabled={saving || !canCreate}>{saving ? 'Saving…' : 'Create'}</Button>
                  <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                  {!canCreate && (
                    <span className="text-xs text-gray-400">
                      Title, target, a positive price and a valid start&nbsp;&lt;&nbsp;end window are required.
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="p-4 pb-0">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  Offers {data && <Badge variant="outline">{data.total} total</Badge>}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Input placeholder="Search title" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-56" />
                  <Select
                    value={activeFilter}
                    onChange={(e) => { setActiveFilter(e.target.value as '' | 'true' | 'false'); setPage(1); }}
                    className="w-40"
                    options={[{ value: '', label: 'All states' }, { value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]}
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
                isEmpty={!data || data.offers.length === 0}
                emptyMessage="No offers match this filter yet."
                onRetry={() => refetch()}
              >
                {data && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs text-gray-500 uppercase">
                        <tr>
                          <th className="py-2 pr-3">Title</th>
                          <th className="py-2 pr-3">Target</th>
                          <th className="py-2 pr-3">Offer price</th>
                          <th className="py-2 pr-3">Window</th>
                          <th className="py-2 pr-3">Status</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {data.offers.map((offer) => (
                          <tr key={offer.id}>
                            <td className="py-2 pr-3 font-medium">{offer.title}</td>
                            <td className="py-2 pr-3">
                              <Badge variant="outline">{offer.targetType}</Badge>{' '}
                              <span className="text-xs text-gray-500">{offer.targetId.slice(0, 8)}…</span>
                            </td>
                            <td className="py-2 pr-3">{offer.offerPriceGameCurrency}</td>
                            <td className="py-2 pr-3 text-xs text-gray-500">
                              {new Date(offer.startsAt).toLocaleDateString()} → {new Date(offer.endsAt).toLocaleDateString()}
                            </td>
                            <td className="py-2 pr-3">
                              <Badge variant={offer.active ? 'success' : 'danger'}>{offer.active ? 'Active' : 'Inactive'}</Badge>
                            </td>
                            <td className="py-2 text-right">
                              {canWrite && (
                                <Button size="sm" variant="outline" onClick={() => toggleActive(offer)}>
                                  {offer.active ? 'Deactivate' : 'Activate'}
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
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
