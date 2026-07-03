import apiClient from '@/lib/api/api-client';

export interface Achievement {
  id: string;
  code: string;
  title: Record<string, string>;
  description: Record<string, string> | null;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  criteria: {
    type: string;
    target: number;
    gameType?: string;
    metadata?: Record<string, unknown>;
  };
  rewards: {
    gold?: number;
    gems?: number;
    xp?: number;
    itemCode?: string;
  };
  iconUrl?: string | null;
  isActive: boolean;
  isHidden: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  achievement: Achievement;
  progress: number;
  unlockedAt: string | null;
  createdAt: string;
}

export interface CreateAchievementRequest {
  code: string;
  titleI18n: Record<string, string>;
  descriptionI18n?: Record<string, string>;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  criteria: {
    type: string;
    target: number;
    gameType?: string;
    metadata?: Record<string, unknown>;
  };
  rewards?: {
    gold?: number;
    gems?: number;
    xp?: number;
    itemCode?: string;
  };
  iconUrl?: string;
  isHidden?: boolean;
  isActive?: boolean;
}

export interface UpdateAchievementRequest {
  titleI18n?: Record<string, string>;
  descriptionI18n?: Record<string, string>;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  criteria?: {
    type: string;
    target: number;
    gameType?: string;
    metadata?: Record<string, unknown>;
  };
  rewards?: {
    gold?: number;
    gems?: number;
    xp?: number;
    itemCode?: string;
  };
  iconUrl?: string;
  isHidden?: boolean;
  isActive?: boolean;
}

function normalizeArrayResponse<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response;
  if (response && typeof response === 'object') {
    const res = response as Record<string, unknown>;
    if (Array.isArray(res.data)) return res.data as T[];
    if (Array.isArray(res.achievements)) return res.achievements as T[];
    if (Array.isArray(res.items)) return res.items as T[];
    for (const key in res) {
      if (Array.isArray(res[key])) return res[key] as T[];
    }
  }
  return [];
}

export const achievementsService = {
  async getAchievements(): Promise<Achievement[]> {
    const response = await apiClient.get<unknown>('/admin/achievements');
    return normalizeArrayResponse<Achievement>(response);
  },

  async getAchievementById(id: string): Promise<Achievement> {
    return apiClient.get<Achievement>(`/admin/achievements/${id}`);
  },

  async createAchievement(data: CreateAchievementRequest): Promise<Achievement> {
    return apiClient.post<Achievement>('/admin/achievements', data);
  },

  async updateAchievement(id: string, data: UpdateAchievementRequest): Promise<Achievement> {
    return apiClient.put<Achievement>(`/admin/achievements/${id}`, data);
  },

  async deleteAchievement(id: string): Promise<void> {
    await apiClient.delete(`/admin/achievements/${id}`);
  },

  async getCatalog(): Promise<Achievement[]> {
    const response = await apiClient.get<unknown>('/admin/catalog/achievements');
    return normalizeArrayResponse<Achievement>(response);
  },

  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    const response = await apiClient.get<unknown>(`/achievements/user/${userId}`);
    return normalizeArrayResponse<UserAchievement>(response);
  },

  async getPublicAchievements(): Promise<Achievement[]> {
    const response = await apiClient.get<unknown>('/achievements');
    return normalizeArrayResponse<Achievement>(response);
  },

  async getMyAchievements(): Promise<Achievement[]> {
    const response = await apiClient.get<unknown>('/achievements/me');
    return normalizeArrayResponse<Achievement>(response);
  },

  async getMyUnlocked(): Promise<UserAchievement[]> {
    const response = await apiClient.get<unknown>('/achievements/me/unlocked');
    return normalizeArrayResponse<UserAchievement>(response);
  },

  async getMyIncomplete(): Promise<UserAchievement[]> {
    const response = await apiClient.get<unknown>('/achievements/me/incomplete');
    return normalizeArrayResponse<UserAchievement>(response);
  },

  async getMyRare(): Promise<UserAchievement[]> {
    const response = await apiClient.get<unknown>('/achievements/me/rare');
    return normalizeArrayResponse<UserAchievement>(response);
  },

  async claimAchievement(achievementId: string): Promise<void> {
    await apiClient.post(`/achievements/${achievementId}/claim`);
  },
};

export default achievementsService;
