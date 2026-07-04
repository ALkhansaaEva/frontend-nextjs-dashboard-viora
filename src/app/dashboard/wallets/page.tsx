'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wallet, Coins, Gem, Search } from 'lucide-react';
import { adminService } from '@/services/admin.service';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Modal } from '@/shared/components/ui/Modal';
import { Badge } from '@/shared/components/ui/Badge';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { PageSkeleton } from '@/components/skeletons';
import { useLanguage } from '@/components/language-context';
import type { User } from '@/types';

export default function WalletsPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [adjustForm, setAdjustForm] = useState({ currency: 'gold' as 'gold' | 'gems', amount: '', action: 'add' as 'add' | 'deduct', reason: '' });
  const [showAdjust, setShowAdjust] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: () => adminService.getUsers({ page, limit: 20, search: search || undefined }),
  });

  const adjustMutation = useMutation({
    mutationFn: () => {
      if (!selectedUser) throw new Error('No user selected');
      return adminService.adjustUserBalance(selectedUser.id, {
        currency: adjustForm.currency,
        amount: adjustForm.amount,
        action: adjustForm.action,
        reason: adjustForm.reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['user-detail', selectedUser?.id] });
      setShowAdjust(false);
      setAdjustForm({ currency: 'gold', amount: '', action: 'add', reason: '' });
    },
  });

  const { data: walletDetail } = useQuery({
    queryKey: ['user-detail', selectedUser?.id],
    queryFn: () => selectedUser ? adminService.getUserById(selectedUser.id) : Promise.resolve(null as any),
    enabled: !!selectedUser && showAdjust,
  });

  const columns: Column<User>[] = [
    {
      key: 'nickname',
      header: t('user'),
      render: (user) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
            {user.nickname?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-medium text-sm">{user.nickname || '—'}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'gold',
      header: 'Gold',
      render: (user) => (
        <div className="flex items-center gap-1.5">
          <Coins className="w-4 h-4 text-yellow-500" />
          <span className="font-semibold">{user.wallet?.gold?.toLocaleString() ?? '0'}</span>
        </div>
      ),
    },
    {
      key: 'gems',
      header: 'Gems',
      render: (user) => (
        <div className="flex items-center gap-1.5">
          <Gem className="w-4 h-4 text-purple-500" />
          <span className="font-semibold">{user.wallet?.gems?.toLocaleString() ?? '0'}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('status'),
      render: (user) => (
        <Badge variant={user.status === 'active' ? 'success' : user.status === 'suspended' ? 'warning' : 'danger'}>
          {user.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (user) => (
        <Button size="sm" variant="outline" onClick={() => { setSelectedUser(user); setShowAdjust(true); }}>
          {t('adjust') || 'Adjust'}
        </Button>
      ),
    },
  ];

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader icon={<Wallet className="w-6 h-6 text-emerald-500" />} title={t('wallets') || 'User Wallets'} />

      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t('searchUsers') || 'Search users...'}
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400" />
        </div>
        <p className="text-sm text-gray-500 self-center">{data?.total ?? 0} {t('users') || 'users'}</p>
      </div>

      <DataTable data={data?.data || []} columns={columns}
        pagination={data ? { page: data.page, limit: data.limit, total: data.total, totalPages: data.totalPages, onPageChange: setPage } : undefined}
        emptyMessage={t('noUsers') || 'No users found'} />

      <Modal isOpen={showAdjust} onClose={() => setShowAdjust(false)}
        title={t('adjustBalance') || `Adjust Balance - ${selectedUser?.nickname || ''}`}>
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-yellow-500" />
              <span className="font-semibold">{walletDetail?.wallet?.gold?.toLocaleString() ?? selectedUser?.wallet?.gold?.toLocaleString() ?? '?'}</span>
            </div>
            <span className="text-gray-400">|</span>
            <div className="flex items-center gap-1.5">
              <Gem className="w-4 h-4 text-purple-500" />
              <span className="font-semibold">{walletDetail?.wallet?.gems?.toLocaleString() ?? selectedUser?.wallet?.gems?.toLocaleString() ?? '?'}</span>
            </div>
          </div>

          <Select label={t('action') || 'Action'} value={adjustForm.action}
            onChange={(e) => setAdjustForm({ ...adjustForm, action: e.target.value as 'add' | 'deduct' })}
            options={[{ value: 'add', label: 'Add Funds' }, { value: 'deduct', label: 'Deduct Funds' }]} />

          <Select label={t('currency') || 'Currency'} value={adjustForm.currency}
            onChange={(e) => setAdjustForm({ ...adjustForm, currency: e.target.value as 'gold' | 'gems' })}
            options={[{ value: 'gold', label: 'Gold' }, { value: 'gems', label: 'Gems' }]} />

          <Input label={t('amount') || 'Amount'} type="number" min="1" placeholder="100"
            value={adjustForm.amount}
            onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })} />

          <Input label={t('reason') || 'Reason'} placeholder="Daily reward, purchase refund..."
            value={adjustForm.reason}
            onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })} />

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowAdjust(false)}>{t('cancel')}</Button>
            <Button onClick={() => adjustMutation.mutate()}
              disabled={!adjustForm.amount || !adjustForm.reason || adjustMutation.isPending}
              variant={adjustForm.action === 'deduct' ? 'danger' : 'primary'}>
              {adjustMutation.isPending ? (t('processing') || 'Processing...') : adjustForm.action === 'add' ? (t('addFunds') || 'Add Funds') : (t('deductFunds') || 'Deduct Funds')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
