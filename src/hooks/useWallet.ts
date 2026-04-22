'use client';

import { useQuery } from '@tanstack/react-query';
import { walletService } from '@/services';
import type { Wallet, PaginatedResponse } from '@/types';

interface WalletTransaction {
  id: string;
  userId: string;
  type: 'credit' | 'debit';
  currency: 'gold' | 'gems';
  amount: string;
  balanceAfter: string;
  reason: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export const useWallet = () => {
  return useQuery<Wallet>({
    queryKey: ['wallet'],
    queryFn: () => walletService.getWallet(),
    staleTime: 30000,
  });
};

export const useWalletTransactions = (params?: { page?: number; limit?: number }) => {
  return useQuery<PaginatedResponse<WalletTransaction>>({
    queryKey: ['wallet-transactions', params],
    queryFn: () => walletService.getTransactions(params),
    staleTime: 30000,
  });
};