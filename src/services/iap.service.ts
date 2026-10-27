import apiClient from '@/lib/api/api-client';

/**
 * §38 IAP product mapping admin service — wraps IapAdminController
 * (`/admin/iap/products`). Mappings bind a provider product to a canonical
 * grant: GAME_CURRENCY amount, Store ITEM, or Store BUNDLE.
 */
export interface IapProductMapping {
  id: string;
  provider: 'google_play' | 'apple_app_store';
  providerProductId: string;
  applicationId: string;
  currency: 'GAME_CURRENCY';
  grantType: 'GAME_CURRENCY' | 'ITEM' | 'BUNDLE';
  grantAmount: string;
  grantReference?: string | null;
  active: boolean;
}

export interface IapProductInput {
  provider: 'google_play' | 'apple_app_store';
  applicationId: string;
  providerProductId: string;
  grantType: 'GAME_CURRENCY' | 'ITEM' | 'BUNDLE';
  grantAmount?: string;
  grantReference?: string | null;
  active?: boolean;
}

export type IapProductUpdate = Partial<
  Pick<
    IapProductInput,
    'applicationId' | 'grantType' | 'grantAmount' | 'grantReference' | 'active'
  >
>;

export interface IapProductListResult {
  mappings: IapProductMapping[];
  total: number;
  page: number;
  limit: number;
}

export const iapService = {
  async listProducts(query: {
    page?: number;
    limit?: number;
    provider?: string;
    active?: boolean;
  } = {}): Promise<IapProductListResult> {
    return apiClient.get<IapProductListResult>('/admin/iap/products', { params: query });
  },
  async createProduct(data: IapProductInput): Promise<IapProductMapping> {
    return apiClient.post<IapProductMapping>('/admin/iap/products', data);
  },
  async updateProduct(id: string, data: IapProductUpdate): Promise<IapProductMapping> {
    return apiClient.patch<IapProductMapping>(`/admin/iap/products/${id}`, data);
  },
};

export default iapService;
