'use client';

import { useState } from 'react';
import { QueryErrorNotice } from '@/shared/components/ui/QueryState';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wallet, Coins, Search, Copy, Check } from 'lucide-react';
import { adminService } from '@/services/admin.service';
import { useHasPermission } from '@/hooks/usePermissions';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Modal } from '@/shared/components/ui/Modal';
import { Badge } from '@/shared/components/ui/Badge';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { PageSkeleton } from '@/components/skeletons';
import { useLanguage } from '@/components/language-context';
import { useToast } from '@/store/toast.store';
import { formatIntegerString, sanitizeIntegerInput, isPositiveIntegerString } from '@/shared/lib/money';
import type { User } from '@/types';

/** Right-aligned, monospace GAME_CURRENCY amount — `undefined` (no wallet row
 * / request failed) renders "N/A", never a fake "0". A backend-confirmed
 * zero balance still renders "0". Amounts are numeric(30,0) on the backend —
 * `formatIntegerString` never routes the value through a JS `number`, so a
 * balance past Number.MAX_SAFE_INTEGER still renders exactly. */
function GameCurrencyDisplay({ amount }: { amount: string | undefined }) {
  if (amount === undefined) {
    return <span className="text-gray-400 dark:text-gray-500 text-sm">N/A</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 font-mono font-semibold tabular-nums">
      <Coins className="w-4 h-4 text-emerald-500" />
      {formatIntegerString(amount)}
    </span>
  );
}

function CopyId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(id).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200); }); }}
      className="inline-flex items-center gap-1 text-[10px] font-mono text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      title={id}
    >
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
      {id.slice(0, 8)}…
    </button>
  );
}

/**
 * Wallet Administration — GET /admin/users (game_currency joined per row) +
 * POST /admin/users/:id/balance. There is no separate `/admin/wallets`
 * listing endpoint; wallet balance is a column on the Users admin list. The
 * historical Gold/Gems split does not exist on the backend (Wallet entity —
 * modules/wallet/entities/wallet.entity.ts — has a single `gameCurrency`
 * numeric(30,0) column) and has been removed here entirely.
 */
export default function WalletsPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  const hasPermission = useHasPermission();
  // GET /admin/users is gated on users.write (admin.controller.ts `@RequirePermissions(PERMS.usersWrite)`),
  // NOT on wallet.* — gating the list on wallet.read alone produced a guaranteed 403.
  const canList = hasPermission('users.write');
  const canAdjust = hasPermission('wallet.write');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [adjustForm, setAdjustForm] = useState({ amount: '', action: 'add' as 'add' | 'deduct', reason: '' });
  const [showAdjust, setShowAdjust] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: () => adminService.getUsers({ page, limit: 20, search: search || undefined }),
    enabled: canList,
  });

  const adjustMutation = useMutation({
    mutationFn: () => {
      if (!selectedUser) throw new Error('No user selected');
      return adminService.adjustUserBalance(selectedUser.id, {
        currency: 'GAME_CURRENCY',
        amount: adjustForm.amount,
        action: adjustForm.action,
        reason: adjustForm.reason,
        // Fresh id per submit: the backend derives the ledger idempotency key from it
        // (`admin-balance:<adminId>:<operationId>`), so reusing one would silently
        // swallow a genuine second adjustment as a duplicate.
        operationId: crypto.randomUUID(),
      });
    },
    onSuccess: () => {
      // Never optimistically compute the new balance client-side — refetch
      // the authoritative server state instead.
      queryClient.invalidateQueries({ queryKey: ['admin-users'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['user-detail', selectedUser?.id] });
      setShowAdjust(false);
      setAdjustForm({ amount: '', action: 'add', reason: '' });
      toast.success('Balance adjusted.');
    },
    onError: (err: unknown) => {
      const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Failed to adjust balance';
      toast.error(message);
    },
  });

  const { data: walletDetail } = useQuery({
    queryKey: ['user-detail', selectedUser?.id],
    queryFn: () => (selectedUser ? adminService.getUserById(selectedUser.id) : Promise.resolve(null)),
    enabled: !!selectedUser && showAdjust,
  });

  const currentBalance = walletDetail?.wallet?.gameCurrency ?? selectedUser?.wallet?.gameCurrency;

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
            <CopyId id={user.id} />
          </div>
        </div>
      ),
    },
    {
      key: 'gameCurrency',
      header: 'GAME_CURRENCY',
      render: (user) => <GameCurrencyDisplay amount={user.wallet?.gameCurrency} />,
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
        canAdjust ? (
          <Button size="sm" variant="outline" onClick={() => { setSelectedUser(user); setShowAdjust(true); }}>
            {t('adjust') || 'Adjust'}
          </Button>
        ) : null
      ),
    },
  ];

  if (!canList) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-500">
          Wallet administration lists balances through <code>GET /admin/users</code>, which requires{' '}
          <code>users.write</code>.{' '}
          {hasPermission('wallet.write')
            ? 'You hold wallet.write, but the user list is not readable with it.'
            : 'You do not have it.'}
        </div>
      </div>
    );
  }

  if (isLoading) return <PageSkeleton />;
  if (isError) {
    return (
      <div className="space-y-6">
        <QueryErrorNotice error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={<Wallet className="w-6 h-6 text-emerald-500" />} title={t('wallets') || 'Wallet Administration'} />

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
        title={t('adjustBalance') || `Adjust Balance — ${selectedUser?.nickname || ''}`}>
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <span className="text-xs text-gray-500">Current balance</span>
            <GameCurrencyDisplay amount={currentBalance} />
          </div>

          <Select label={t('action') || 'Action'} value={adjustForm.action}
            onChange={(e) => setAdjustForm({ ...adjustForm, action: e.target.value as 'add' | 'deduct' })}
            options={[{ value: 'add', label: 'Add Funds' }, { value: 'deduct', label: 'Deduct Funds' }]} />

          <Input label="Amount (GAME_CURRENCY, positive integer)" type="text" inputMode="numeric" placeholder="100"
            value={adjustForm.amount}
            onChange={(e) => setAdjustForm({ ...adjustForm, amount: sanitizeIntegerInput(e.target.value) })} />

          <Input label={t('reason') || 'Reason'} placeholder="Daily reward, purchase refund..."
            value={adjustForm.reason}
            onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })} />

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowAdjust(false)}>{t('cancel')}</Button>
            <Button onClick={() => adjustMutation.mutate()}
              disabled={!isPositiveIntegerString(adjustForm.amount) || !adjustForm.reason || adjustMutation.isPending}
              variant={adjustForm.action === 'deduct' ? 'danger' : 'primary'}>
              {adjustMutation.isPending ? (t('processing') || 'Processing...') : adjustForm.action === 'add' ? (t('addFunds') || 'Add Funds') : (t('deductFunds') || 'Deduct Funds')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
