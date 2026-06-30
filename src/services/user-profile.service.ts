import apiClient from './api.client';
import type { User } from '@/types';

interface UserProfile {
  nickname?: string;
  title?: string;
  status?: string;
  presence?: string;
}

interface UserBootstrap {
  user: User;
  wallet: {
    userId: string;
    gold: number;
    gems: number;
  };
  dailyLogin?: {
    canClaim: boolean;
    streak: number;
  };
  loadout?: Record<string, unknown>;
}

export const userProfileService = {
  async getProfile(): Promise<User> {
    const response = await apiClient.get<{ user: User }>('/users/me');
    return response.user;
  },

  async getBootstrap(): Promise<UserBootstrap> {
    return apiClient.get<UserBootstrap>('/users/me/bootstrap');
  },

  async updateProfile(data: UserProfile): Promise<User> {
    const response = await apiClient.patch<{ user: User }>('/users/me/profile', data);
    return response.user;
  },

  async updateAvatar(avatar: string): Promise<User> {
    const response = await apiClient.patch<{ user: User }>('/users/me/avatar', { avatar });
    return response.user;
  },

  async updateProfileCosmetics(cosmetics: Record<string, unknown>): Promise<User> {
    const response = await apiClient.patch<{ user: User }>('/users/me/profile-cosmetics', cosmetics);
    return response.user;
  },

  async updatePresence(presence: string): Promise<void> {
    await apiClient.patch('/users/me/presence', { presence });
  },

  async verifyEmailOTP(otp: string): Promise<void> {
    await apiClient.patch('/users/me/email-otp', { otp });
  },

  async getUserById(immutableUserId: string): Promise<User> {
    const response = await apiClient.get<{ user: User }>(`/users/${immutableUserId}`);
    return response.user;
  },
};

export default userProfileService;