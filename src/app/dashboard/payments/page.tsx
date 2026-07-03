'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, RefreshCw, Search, Coins, Gem, AlertCircle } from 'lucide-react';
import { adminService } from '@/services/admin.service';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Modal } from '@/shared/components/ui/Modal';
import { Badge } from '@/shared/components/ui/Badge';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { PageSkeleton } from '@/components/skeletons';
import { useLanguage } from '@/components/language-context';

interface PurchaseRecord {
  id: string;
  userId: string;
  userNickname: string;
  itemName: string;
  currency: 'gold' | 'gems';
  amount: number;
  status: string;
  createdAt: string;
}

export default function PaymentsPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [purchaseId, setPurchaseId] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [showRefund, setShowRefund] = useState(false);
  const [search, setSearch] = useState('');

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['admin-purchases'],
    queryFn: async () => {
      const users = await adminService.getUsers({ limit: 50 });
      const all: PurchaseRecord[] = [];
      for (const user of users.data) {
        try {
          const userPurchases = await adminService.getUserPurchases(user.id) as PurchaseRecord[];
          all.push(...userPurchases.map(p => ({ ...p, userNickname: user.nickname })));
        } catch { }
      }
      return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
  });

  const refundMutation = useMutation({
    mutationFn: () => adminService.refundPurchase(purchaseId, refundReason),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-purchases'] }); setShowRefund(false); setRefundReason(''); setPurchaseId(''); },
  });

  const filtered = purchases.filter(p =>
    !search || p.id.includes(search) || p.userNickname?.toLowerCase().includes(search.toLowerCase()) || p.itemName?.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<PurchaseRecord>[] = [
    { key: 'id', header: 'ID', render: (p) => <span className="text-xs font-mono">{p.id?.slice(0, 8)}...</span> },
    { key: 'user', header: t('user'), render: (p) => <span className="font-medium text-sm">{p.userNickname || p.userId?.slice(0, 8)}</span> },
    { key: 'item', header: t('item') || 'Item', render: (p) => <span className="text-sm">{p.itemName || '—'}</span> },
    {
      key: 'amount', header: t('amount'),
      render: (p) => (
        <div className="flex items-center gap-1.5">
          {p.currency === 'gems' ? <Gem className="w-4 h-4 text-purple-500" /> : <Coins className="w-4 h-4 text-yellow-500" />}
          <span className="font-semibold">{p.amount}</span>
          <span className="text-xs text-gray-400">{p.currency}</span>
        </div>
      ),
    },
    {
      key: 'status', header: t('status'),
      render: (p) => <Badge variant={p.status === 'completed' ? 'success' : p.status === 'refunded' ? 'warning' : 'danger'}>{p.status}</Badge>,
    },
    {
      key: 'date', header: t('date'),
      render: (p) => <span className="text-sm text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: 'actions', header: '',
      render: (p) => p.status !== 'refunded' ? (
        <Button size="sm" variant="outline" onClick={() => { setPurchaseId(p.id); setShowRefund(true); }}>
          <RefreshCw className="w-3 h-3 mr-1" /> {t('refund') || 'Refund'}
        </Button>
      ) : <span className="text-xs text-gray-400 italic">{t('refunded') || 'Refunded'}</span>,
    },
  ];

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader icon={<CreditCard className="w-6 h-6 text-cyan-500" />} title={t('payments') || 'Payment Operations'} />

      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search') || 'Search purchases...'}
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400" />
        </div>
        <p className="text-sm text-gray-500 self-center">{filtered.length} {t('transactions') || 'transactions'}</p>
      </div>

      <DataTable data={filtered} columns={columns} emptyMessage={t('noTransactions') || 'No purchase records'} />

      <Modal isOpen={showRefund} onClose={() => setShowRefund(false)} title={t('processRefund') || 'Process Refund'}>
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-300">{t('refundWarning') || 'This will refund the full purchase amount to the user and remove the item from their inventory.'}</p>
          </div>
          <p className="text-sm text-gray-500 font-mono">{t('purchaseId') || 'Purchase ID'}: {purchaseId}</p>
          <Input label={t('reason') || 'Reason *'} placeholder="Customer request, billing error..."
            value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowRefund(false)}>{t('cancel')}</Button>
            <Button variant="danger" onClick={() => refundMutation.mutate()} disabled={!refundReason || refundMutation.isPending}>
              {refundMutation.isPending ? (t('processing') || 'Processing...') : (t('confirmRefund') || 'Confirm Refund')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
