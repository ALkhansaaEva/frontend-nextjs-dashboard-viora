import apiClient from '@/lib/api/api-client';

/**
 * Mirrors backend `CurrencyDisplayConfig` entity / `CurrencyDisplayAdminController`
 * (modules/wallet/currency-display.controller.ts, GET/PUT /admin/currency-display).
 *
 * This is customer-facing DISPLAY metadata only — name/symbol/icon/labels. The
 * internal ledger/business key is always `GAME_CURRENCY` and is never editable
 * here; mutating this config never touches balances or ledger history.
 */
export interface CurrencyDisplayConfig {
  currencyCode: string;
  displayName: string;
  shortName: string | null;
  symbol: string | null;
  iconAssetRef: string | null;
  localizedNames: Record<string, string>;
  decimalDisplay: number;
  enabled: boolean;
  version: number;
  updatedBy: string | null;
  changeReason: string | null;
  updatedAt: string;
}

export interface CurrencyDisplayUpdateRequest {
  displayName?: string;
  shortName?: string | null;
  symbol?: string | null;
  iconAssetRef?: string | null;
  localizedNames?: Record<string, string>;
  /** Integer 0-6 — backend rejects anything else. */
  decimalDisplay?: number;
  enabled?: boolean;
  /** Required by the backend audit trail. */
  changeReason: string;
}

export const currencyDisplayService = {
  /** GET /admin/currency-display — requires admin.read. */
  async get(): Promise<CurrencyDisplayConfig> {
    return apiClient.get<CurrencyDisplayConfig>('/admin/currency-display');
  },

  /** PUT /admin/currency-display — requires configs.write. */
  async update(data: CurrencyDisplayUpdateRequest): Promise<CurrencyDisplayConfig> {
    return apiClient.put<CurrencyDisplayConfig>('/admin/currency-display', data);
  },
};

export default currencyDisplayService;
