'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Archive, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Select } from '@/shared/components/ui/Select';
import { Badge } from '@/shared/components/ui/Badge';
import { QueryState } from '@/shared/components/ui/QueryState';
import { useHasPermission } from '@/hooks/usePermissions';
import rulesService from '@/services/rules.service';
import storeOffersService from '@/services/store-offers.service';
import { humanizeToken, ruleTitle } from '@/shared/lib/labels';

type ArchiveTab = 'rules' | 'offers';
const KIND_OPTIONS = [
  { value: '', label: 'All kinds' },
  { value: 'TASK', label: 'Tasks' },
  { value: 'ACHIEVEMENT', label: 'Achievements' },
  { value: 'CAMPAIGN', label: 'Campaigns' },
];

/**
 * §43 Archive Center — a read projection over canonical domains. Nothing is
 * duplicated for this page: archived Rule versions (incl. Tasks/Achievements/
 * Campaigns) come from /admin/rules?state=ARCHIVED; inactive/expired Store
 * Offers come from /admin/store/offers. Financial history deliberately lives
 * under Reports, not here.
 */
export default function ArchiveCenterPage() {
  const hasPermission = useHasPermission();
  const canReadRules = hasPermission('achievements.read');
  const canReadOffers = hasPermission('store.catalog_read');

  const [tab, setTab] = useState<ArchiveTab>('rules');
  const [kind, setKind] = useState('');
  const [offset, setOffset] = useState(0);
  const LIMIT = 25;

  const rulesQuery = useQuery({
    queryKey: ['archive', 'rules', kind, offset],
    queryFn: () =>
      rulesService.listRules({
        state: 'ARCHIVED',
        kind: (kind || undefined) as 'TASK' | 'ACHIEVEMENT' | 'CAMPAIGN' | undefined,
        limit: LIMIT,
        offset,
      }),
    enabled: tab === 'rules' && canReadRules,
  });

  const offersQuery = useQuery({
    queryKey: ['archive', 'offers', offset],
    queryFn: () =>
      storeOffersService.list({
        active: false,
        page: Math.floor(offset / LIMIT) + 1,
        limit: LIMIT,
      }),
    enabled: tab === 'offers' && canReadOffers,
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Archive Center"
        description="Read-only projection of archived Rules, Tasks, Achievements, Campaigns and expired Offers. Archive is never delete — history stays queryable."
        icon={<Archive className="w-5 h-5" />}
      />

      <div className="flex gap-2">
        <Button
          variant={tab === 'rules' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => {
            setTab('rules');
            setOffset(0);
          }}
        >
          Rules & Definitions
        </Button>
        <Button
          variant={tab === 'offers' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => {
            setTab('offers');
            setOffset(0);
          }}
        >
          Store Offers
        </Button>
      </div>

      {tab === 'rules' && (
        <Card>
          <CardHeader className="p-4 pb-0">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                Archived definitions
                {rulesQuery.data && <Badge variant="outline">{rulesQuery.data.total} total</Badge>}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Select
                  value={kind}
                  onChange={(e) => {
                    setKind(e.target.value);
                    setOffset(0);
                  }}
                  className="w-44"
                  options={KIND_OPTIONS}
                />
                <Button size="sm" variant="outline" onClick={() => rulesQuery.refetch()}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <QueryState
              isLoading={rulesQuery.isLoading}
              isError={rulesQuery.isError}
              error={rulesQuery.error}
              isEmpty={!rulesQuery.data || rulesQuery.data.items.length === 0}
              emptyMessage="Nothing archived yet."
              onRetry={() => rulesQuery.refetch()}
            >
              {rulesQuery.data && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="py-2 pr-3">Name</th>
                        <th className="py-2 pr-3">Kind</th>
                        <th className="py-2 pr-3">Version</th>
                        <th className="py-2 pr-3">State</th>
                        <th className="py-2 pr-3">Archived</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {rulesQuery.data.items.map((rule) => (
                        <tr key={rule.id}>
                          <td className="py-2 pr-3">
                            <span className="font-medium">{ruleTitle(rule)}</span>
                            <span className="block font-mono text-[10px] text-gray-400">
                              {rule.definitionKey}
                            </span>
                          </td>
                          <td className="py-2 pr-3">
                            <Badge variant="outline">{humanizeToken(rule.kind)}</Badge>
                          </td>
                          <td className="py-2 pr-3">v{rule.definitionVersion}</td>
                          <td className="py-2 pr-3">
                            <Badge variant="danger">{humanizeToken(rule.state)}</Badge>
                          </td>
                          <td className="py-2 pr-3 text-xs text-gray-500">
                            {new Date(rule.updatedAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                    <span>
                      {offset + 1}–{Math.min(offset + LIMIT, rulesQuery.data.total)} of{' '}
                      {rulesQuery.data.total}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={offset === 0}
                        onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
                      >
                        Prev
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={offset + LIMIT >= rulesQuery.data.total}
                        onClick={() => setOffset((o) => o + LIMIT)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </QueryState>
          </CardContent>
        </Card>
      )}

      {tab === 'offers' && (
        <Card>
          <CardHeader className="p-4 pb-0">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                Inactive / expired offers
                {offersQuery.data && (
                  <Badge variant="outline">{offersQuery.data.total} total</Badge>
                )}
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => offersQuery.refetch()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <QueryState
              isLoading={offersQuery.isLoading}
              isError={offersQuery.isError}
              error={offersQuery.error}
              isEmpty={!offersQuery.data || offersQuery.data.offers.length === 0}
              emptyMessage="No inactive offers."
              onRetry={() => offersQuery.refetch()}
            >
              {offersQuery.data && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="py-2 pr-3">Title</th>
                        <th className="py-2 pr-3">Target</th>
                        <th className="py-2 pr-3">Offer price</th>
                        <th className="py-2 pr-3">Window</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {offersQuery.data.offers.map((offer) => (
                        <tr key={offer.id}>
                          <td className="py-2 pr-3 font-medium">{offer.title}</td>
                          <td className="py-2 pr-3">
                            <Badge variant="outline">{offer.targetType}</Badge>
                          </td>
                          <td className="py-2 pr-3">{offer.offerPriceGameCurrency}</td>
                          <td className="py-2 pr-3 text-xs text-gray-500">
                            {new Date(offer.startsAt).toLocaleDateString()} →{' '}
                            {new Date(offer.endsAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </QueryState>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
