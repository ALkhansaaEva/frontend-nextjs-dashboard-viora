'use client';

import { useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Coins, ArrowUpRight, ArrowDownLeft, History } from 'lucide-react';
import { useWallet, useWalletTransactions } from '@/hooks';
import { useLanguage } from '@/components/language-context';
import { TableSkeleton } from '@/components/skeletons';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { formatIntegerString } from '@/shared/lib/money';

/**
 * View model of a transaction row. `wallet_txns` stores no `type` column —
 * `walletService.getTransactions` derives `credit`/`debit` from the balance
 * movement (BigInt compare) so this table can keep rendering a direction.
 */
interface WalletTransaction {
  id: string;
  userId: string;
  type: 'credit' | 'debit';
  currency: 'GAME_CURRENCY';
  amount: string;
  balanceAfter: string;
  reason: string;
  createdAt: string;
}

export default function WalletPage() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const page = parseInt(searchParams.get('page') || '1', 10);

  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { data: transactions, isLoading: transactionsLoading } = useWalletTransactions({
    page,
    limit: 20,
  });

  const handlePageChange = useCallback((newPage: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set('page', newPage.toString());
    window.history.pushState({}, '', url);
  }, []);

  const isLoading = walletLoading || transactionsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('wallet')}</h1>
        <TableSkeleton rows={5} />
      </div>
    );
  }

  const columns: Column<WalletTransaction>[] = [
    {
      key: 'type',
      header: t('type'),
      render: (txn) => (
        <div className="flex items-center gap-2">
          {txn.type === 'credit' ? (
            <ArrowUpRight className="w-4 h-4 text-green-500" />
          ) : (
            <ArrowDownLeft className="w-4 h-4 text-red-500" />
          )}
          <Badge variant={txn.type === 'credit' ? 'success' : 'danger'}>
            {txn.type === 'credit' ? t('credit') : t('debit')}
          </Badge>
        </div>
      ),
    },
    {
      key: 'currency',
      header: t('currency'),
      render: (txn) => (
        <div className="flex items-center gap-1.5">
          <Coins className="w-4 h-4 text-emerald-500" />
          <span className="font-medium">{txn.currency}</span>
        </div>
      ),
    },
    {
      key: 'amount',
      header: t('amount'),
      render: (txn) => (
        <span className={`font-semibold ${txn.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
          {txn.type === 'credit' ? '+' : '-'}{txn.amount}
        </span>
      ),
    },
    {
      key: 'reason',
      header: t('reason'),
      render: (txn) => (
        <span className="text-gray-600 dark:text-gray-400">{txn.reason || '-'}</span>
      ),
    },
    {
      key: 'balanceAfter',
      header: t('balanceAfter'),
      render: (txn) => (
        <span className="text-gray-600 dark:text-gray-400">{txn.balanceAfter}</span>
      ),
    },
    {
      key: 'createdAt',
      header: t('date'),
      render: (txn) => (
        <span className="text-gray-600 dark:text-gray-400">
          {new Date(txn.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('wallet')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl">
                <Coins className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">GAME_CURRENCY</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatIntegerString(wallet?.gameCurrency)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            {t('transactions')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={transactions?.data || []}
            columns={columns}
            pagination={
              transactions && {
                page: transactions.page,
                limit: transactions.limit,
                total: transactions.total,
                totalPages: transactions.totalPages,
                onPageChange: handlePageChange,
              }
            }
            emptyMessage={t('noTransactions')}
          />
        </CardContent>
      </Card>
    </div>
  );
}