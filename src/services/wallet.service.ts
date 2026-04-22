import apiClient from './api.client';
import type { Wallet, PaginatedResponse, ListParams } from '@/types';

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

interface RawPaginatedResponse {
  data?: WalletTransaction[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

function normalizePaginatedResponse(response: unknown): PaginatedResponse<WalletTransaction> {
  const raw = response as RawPaginatedResponse;
  const data = raw.data || [];
  return {
    data,
    total: raw.total || data.length,
    page: raw.page || 1,
    limit: raw.limit || data.length,
    totalPages: raw.totalPages || 1,
  };
}

export const walletService = {
  async getWallet(): Promise<Wallet> {
    return apiClient.get<Wallet>('/wallet');
  },

  async getTransactions(params?: ListParams): Promise<PaginatedResponse<WalletTransaction>> {
    const searchParams = new URLSearchParams();

    if (params?.page) {
      const offset = (params.page - 1) * (params.limit || 20);
      searchParams.set('offset', offset.toString());
    }
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    const url = query ? `/wallet/transactions?${query}` : '/wallet/transactions';

    const response = await apiClient.get<RawPaginatedResponse>(url);
    return normalizePaginatedResponse(response);
  },
};

export default walletService;