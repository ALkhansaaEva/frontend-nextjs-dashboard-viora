import apiClient from '@/lib/api/api-client';

/**
 * §37 StoreOffer admin service — wraps StoreOfferAdminController
 * (`/admin/store/offers`) exactly. Offers override runtime pricing; the base
 * price stays canonical on the Store Item/Bundle.
 */
export interface StoreOffer {
  id: string;
  title: string;
  description?: string | null;
  targetType: 'ITEM' | 'BUNDLE';
  targetId: string;
  offerPriceGameCurrency: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
  eligibleRegions: string[];
  purchaseLimit?: number | null;
  displayPriority: number;
  visualAsset?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoreOfferInput {
  title: string;
  description?: string | null;
  targetType: 'ITEM' | 'BUNDLE';
  targetId: string;
  offerPriceGameCurrency: string;
  startsAt: string;
  endsAt: string;
  active?: boolean;
  eligibleRegions?: string[];
  purchaseLimit?: number | null;
  displayPriority?: number;
  visualAsset?: string | null;
}

export interface StoreOfferListQuery {
  page?: number;
  limit?: number;
  search?: string;
  active?: boolean;
  targetType?: 'ITEM' | 'BUNDLE';
}

export interface StoreOfferListResult {
  offers: StoreOffer[];
  total: number;
  page: number;
  limit: number;
}

export const storeOffersService = {
  async list(query: StoreOfferListQuery = {}): Promise<StoreOfferListResult> {
    return apiClient.get<StoreOfferListResult>('/admin/store/offers', { params: query });
  },
  async create(data: StoreOfferInput): Promise<StoreOffer> {
    return apiClient.post<StoreOffer>('/admin/store/offers', data);
  },
  async update(id: string, data: Partial<StoreOfferInput>): Promise<StoreOffer> {
    return apiClient.patch<StoreOffer>(`/admin/store/offers/${id}`, data);
  },
};

export default storeOffersService;
