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
    const response = await apiClient.get<{ data: User }>('/users/me');
    return response.data;
  },

  async getBootstrap(): Promise<UserBootstrap> {
    const response = await apiClient.get<{ data: UserBootstrap }>('/users/me/bootstrap');
    return response.data;
  },

  async updateProfile(data: UserProfile): Promise<User> {
    const response = await apiClient.patch<{ data: User }>('/users/me/profile', data);
    return response.data;
  },

  async updateAvatar(avatar: string): Promise<User> {
    const response = await apiClient.patch<{ data: User }>('/users/me/avatar', { avatar });
    return response.data;
  },

  async updateProfileCosmetics(cosmetics: Record<string, unknown>): Promise<User> {
    const response = await apiClient.patch<{ data: User }>('/users/me/profile-cosmetics', cosmetics);
    return response.data;
  },

  async updatePresence(presence: string): Promise<void> {
    await apiClient.patch('/users/me/presence', { presence });
  },

  async verifyEmailOTP(otp: string): Promise<void> {
    await apiClient.patch('/users/me/email-otp', { otp });
  },

  async getUserById(immutableUserId: string): Promise<User> {
    const response = await apiClient.get<{ data: User }>(`/users/${immutableUserId}`);
    return response.data;
  },
};

export default userProfileService;