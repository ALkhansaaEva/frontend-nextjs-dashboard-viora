import apiClient from './api.client';
import type { Wallet, PaginatedResponse, ListParams } from '@/types';

/**
 * A `wallet_txns` row exactly as the backend returns it. The table has NO
 * `type` column — direction is a UI concern derived from the balance movement.
 */
interface WalletTransactionRow {
  id: string;
  userId: string;
  currency: 'GAME_CURRENCY';
  amount: string;
  /** numeric(30,0) — a string, and beyond Number.MAX_SAFE_INTEGER. */
  balanceBefore: string;
  /** numeric(30,0) — a string, and beyond Number.MAX_SAFE_INTEGER. */
  balanceAfter: string;
  reason: string;
  createdAt: string;
  meta?: Record<string, unknown>;
}

/**
 * Row + the direction the wallet table renders. Never read from the wire:
 * `credit` when the balance did not shrink, `debit` otherwise. Compared as
 * BigInt because numeric(30,0) overflows a JS number.
 */
export type WalletTransaction = WalletTransactionRow & {
  type: 'credit' | 'debit';
};

/** GET /wallet/transactions answers `{ transactions, total }`. */
interface RawTransactionsResponse {
  transactions?: WalletTransactionRow[];
  total?: number;
  limit?: number;
  offset?: number;
}

function withDirection(row: WalletTransactionRow): WalletTransaction {
  return {
    ...row,
    type:
      BigInt(row.balanceAfter) >= BigInt(row.balanceBefore) ? 'credit' : 'debit',
  };
}

/**
 * The endpoint speaks limit/offset and returns no page/totalPages, so both are
 * derived here from the echoed window.
 */
function normalizePaginatedResponse(
  raw: RawTransactionsResponse,
  requested: { page: number; limit: number },
): PaginatedResponse<WalletTransaction> {
  const data = (raw.transactions ?? []).map(withDirection);
  const total = raw.total ?? data.length;
  const limit = raw.limit || requested.limit;
  const offset = raw.offset ?? (requested.page - 1) * requested.limit;

  return {
    data,
    total,
    page: Math.floor(offset / limit) + 1,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export const walletService = {
  async getWallet(): Promise<Wallet> {
    return apiClient.get<Wallet>('/wallet');
  },

  async getTransactions(params?: ListParams): Promise<PaginatedResponse<WalletTransaction>> {
    const page = params?.page ?? 1;
    const limit = params?.limit || 20;
    const query = new URLSearchParams({
      limit: String(limit),
      offset: String((page - 1) * limit),
    });

    const response = await apiClient.get<RawTransactionsResponse>(
      `/wallet/transactions?${query}`,
    );
    return normalizePaginatedResponse(response, { page, limit });
  },
};

export default walletService;
