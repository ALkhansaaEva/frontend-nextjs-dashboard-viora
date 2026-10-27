import apiClient from './api.client';
import type { User } from '@/types';

/** GET /users/me → the `profile` half (modules/users/users.controller.ts#getMe). */
export interface MeProfile {
  userId: string;
  username?: string | null;
  usernameChangedAt?: string | null;
  avatarUrl?: string | null;
  countryCode?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  bio?: string | null;
  level?: number;
  xp?: number;
  cosmetics?: Record<string, unknown>;
  updatedAt?: string;
}

export interface MeSnapshot {
  user: {
    id: string;
    immutableUserId?: string | null;
    globalNickname?: string | null;
    nickname: string | null;
    title?: string | null;
    status: string;
    email: string;
    createdAt: string;
    roles: string[];
  };
  profile: MeProfile;
  loadout?: unknown;
}

/** Body of PATCH /users/me/profile — verbatim UpdateProfileDto. */
export interface UpdateProfileInput {
  username?: string;
  nickname?: string;
  globalNickname?: string;
  title?: string;
  avatarUrl?: string;
  countryCode?: string;
  gender?: 'male' | 'female' | 'other';
  bio?: string;
}

/**
 * PATCH /users/me/profile returns the merged UserProfile row plus the three
 * User-table identity columns — NOT a `{ user }` envelope.
 */
export interface UpdatedProfile extends MeProfile {
  nickname: string | null;
  globalNickname: string | null;
  title: string | null;
}

/** PATCH /users/me/email-otp returns the UserPresenceSettings row. */
export interface PresenceSettings {
  userId?: string;
  emailOtpEnabled?: boolean;
  hidePresence?: boolean;
  [key: string]: unknown;
}

/**
 * GET /users/me/bootstrap — verbatim shape from
 * modules/users/users.service.ts#getBootstrapData. `wallet.gameCurrency` is
 * the authoritative GAME_CURRENCY balance as a string — never coerce with
 * Number()/parseInt(). There is no `dailyLogin` field on the real response
 * (the backend has no daily-login feature at all — see meta-game.service.ts).
 */
interface UserBootstrap {
  user: User;
  profile: Record<string, unknown>;
  wallet: {
    gameCurrency: string;
    updatedAt: string;
  };
  loadout?: Record<string, unknown>;
}

export const userProfileService = {
  /** GET /users/me — full snapshot (user identity + profile row + loadout). */
  async getMe(): Promise<MeSnapshot> {
    return apiClient.get<MeSnapshot>('/users/me');
  },

  async getProfile(): Promise<User> {
    const response = await apiClient.get<{ user: User }>('/users/me');
    return response.user;
  },

  async getBootstrap(): Promise<UserBootstrap> {
    return apiClient.get<UserBootstrap>('/users/me/bootstrap');
  },

  async updateProfile(data: UpdateProfileInput): Promise<UpdatedProfile> {
    return apiClient.patch<UpdatedProfile>('/users/me/profile', data);
  },

  async updateAvatar(avatarUrl: string): Promise<UpdatedProfile> {
    return apiClient.patch<UpdatedProfile>('/users/me/avatar', { avatarUrl });
  },

  async updateProfileCosmetics(cosmetics: Record<string, unknown>): Promise<UpdatedProfile> {
    return apiClient.patch<UpdatedProfile>('/users/me/profile-cosmetics', { cosmetics });
  },

  async updatePresence(presence: string): Promise<PresenceSettings> {
    return apiClient.patch<PresenceSettings>('/users/me/presence', { status: presence });
  },

  /** PATCH /users/me/email-otp is an enable/disable toggle — there is no OTP submit route. */
  async setEmailOtpEnabled(enabled: boolean): Promise<PresenceSettings> {
    return apiClient.patch<PresenceSettings>('/users/me/email-otp', { enabled });
  },

  async getUserById(immutableUserId: string): Promise<User> {
    const response = await apiClient.get<{ user: User }>(`/users/${immutableUserId}`);
    return response.user;
  },
};

export default userProfileService;