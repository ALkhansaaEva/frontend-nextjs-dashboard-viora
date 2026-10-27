import apiClient from './api.client';
import type { Sanction, Strike } from '@/types';

interface SanctionRequest {
  sanctionType: 'ban' | 'mute' | 'warning';
  reason: string;
  durationHours?: number;
}

interface StrikeRequest {
  points: number;
  reason: string;
}

function normalizeArrayResponse<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response;
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as { data: T[] }).data || [];
  }
  return [];
}

export const moderationService = {
  async sanctionUser(userId: string, data: SanctionRequest): Promise<Sanction> {
    return apiClient.post<Sanction>(`/moderation/users/${userId}/sanction`, data);
  },

  async strikeUser(userId: string, data: StrikeRequest): Promise<Strike> {
    return apiClient.post<Strike>(`/moderation/users/${userId}/strike`, data);
  },

  async getActiveSanctions(userId: string): Promise<Sanction[]> {
    const response = await apiClient.get<Sanction[] | { data: Sanction[] }>(`/moderation/users/${userId}/sanctions/active`);
    return normalizeArrayResponse<Sanction>(response);
  },
};

export default moderationService;
