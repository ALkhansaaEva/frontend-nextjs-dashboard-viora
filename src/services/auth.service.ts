import apiClient from '@/lib/api/api-client';
import { LoginSchema, type LoginRequest, RegisterSchema, type RegisterRequest, OTPVerifySchema } from '@/dto/auth/auth.dto';
import type { AuthLoginResponse } from '@/types';

export interface OAuthUrlResponse {
  url: string;
}

export interface MFAEnrollResponse {
  secret: string;
  qrCode: string;
}

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthLoginResponse> {
    const validated = LoginSchema.parse(credentials);
    const raw = await apiClient.post<AuthLoginResponse | { success: boolean; data: AuthLoginResponse }>(
      '/auth/email/login',
      validated,
    );
    return 'success' in raw ? raw.data : raw;
  },

  async register(credentials: RegisterRequest): Promise<AuthLoginResponse> {
    const validated = RegisterSchema.parse(credentials);
    return apiClient.post<AuthLoginResponse>('/auth/email/register', validated);
  },

  async requestEmailOTP(email: string): Promise<void> {
    await apiClient.post('/auth/email/request-otp', { email });
  },

  async verifyEmailOTP(email: string, token: string): Promise<AuthLoginResponse> {
    const validated = OTPVerifySchema.parse({ email, token });
    const raw = await apiClient.post<AuthLoginResponse | { success: boolean; data: AuthLoginResponse }>(
      '/auth/email/verify-otp',
      validated,
    );
    return 'success' in raw ? raw.data : raw;
  },

  async forgotPassword(email: string): Promise<{
    message: string;
    /** Present only while the backend runs with dev autoconfirm enabled. */
    _dev_recovery_code?: string;
    _dev_note?: string;
  }> {
    return apiClient.post('/auth/forgot-password', { email });
  },

  async resetPassword(
    email: string,
    token: string,
    newPassword: string,
  ): Promise<AuthLoginResponse> {
    const raw = await apiClient.post<AuthLoginResponse | { success: boolean; data: AuthLoginResponse }>(
      '/auth/reset-password',
      { email, token, newPassword },
    );
    return 'success' in raw ? raw.data : raw;
  },

  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: {
      id: string;
      email: string;
    };
    roles: string[];
    permissions?: string[];
  }> {
    return apiClient.post<{
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      user: {
        id: string;
        email: string;
      };
      roles: string[];
      permissions?: string[];
    }>('/auth/refresh', { refreshToken });
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async requestPhoneOTP(phone: string): Promise<void> {
    await apiClient.post('/auth/phone/request-otp', { phone });
  },

  async verifyPhoneOTP(phone: string, token: string): Promise<void> {
    const validated = OTPVerifySchema.parse({ phone, token });
    await apiClient.post('/auth/phone/verify-otp', validated);
  },

  async enrollMFA(): Promise<MFAEnrollResponse> {
    return apiClient.post<MFAEnrollResponse>('/auth/mfa/enroll');
  },

  async getGoogleOAuthUrl(): Promise<string> {
    const response = await apiClient.get<OAuthUrlResponse>('/auth/google/url');
    return response.url;
  },

  async verifyGoogleCallback(code: string, redirectUri?: string): Promise<AuthLoginResponse> {
    return apiClient.post<AuthLoginResponse>('/auth/google/callback', { code, redirectUri });
  },

  /** Redeems the backend's opaque single-use OAuth handoff id for a session. */
  async redeemGoogleHandoff(handoff: string): Promise<AuthLoginResponse> {
    const raw = await apiClient.post<AuthLoginResponse | { success: boolean; data: AuthLoginResponse }>(
      '/auth/google/session',
      { handoff },
    );
    return 'success' in raw ? raw.data : raw;
  },

  async getFacebookOAuthUrl(): Promise<string> {
    const response = await apiClient.get<OAuthUrlResponse>('/auth/facebook/url');
    return response.url;
  },

  async verifyFacebookCallback(code: string, redirectUri?: string): Promise<AuthLoginResponse> {
    return apiClient.post<AuthLoginResponse>('/auth/facebook/callback', { code, redirectUri });
  },

  // POST /auth/link-provider takes only the provider; the backend resolves the
  // provider identity from the authenticated request, not from a client code.
  async linkProvider(provider: string): Promise<void> {
    await apiClient.post('/auth/link-provider', { provider });
  },

  async registerFCMToken(token: string): Promise<void> {
    await apiClient.post('/auth/devices/fcm-token', { token });
  },

  // ── MFA ────────────────────────────────────────────────────────────────
  async mfaFactors(): Promise<{ all?: unknown[]; totp?: unknown[]; phone?: unknown[] }> {
    return apiClient.get('/auth/mfa/factors');
  },

  async mfaChallenge(factorId: string): Promise<{ challengeId: string }> {
    return apiClient.post('/auth/mfa/challenge', { factorId });
  },

  async mfaVerifyEnable(
    factorId: string,
    code: string,
  ): Promise<{
    message: string;
    session?: { accessToken: string; refreshToken: string; expiresIn?: number };
  }> {
    return apiClient.post('/auth/mfa/verify-enable', { factorId, code });
  },

  async mfaDisable(factorId: string): Promise<{ message: string }> {
    return apiClient.post('/auth/mfa/disable', { factorId });
  },

  // ── Account deletion (self-service) ────────────────────────────────────
  async accountDeletionStatus(): Promise<Record<string, unknown>> {
    return apiClient.get('/auth/account/deletion');
  },

  async requestAccountDeletion(reason?: string): Promise<Record<string, unknown>> {
    return apiClient.post('/auth/account/deletion', {
      confirmation: 'DELETE_MY_ACCOUNT',
      ...(reason ? { reason } : {}),
    });
  },

  async cancelAccountDeletion(): Promise<Record<string, unknown>> {
    return apiClient.delete('/auth/account/deletion');
  },

  // ── Connected devices ──────────────────────────────────────────────────
  async listDevices(): Promise<{ devices: Array<Record<string, unknown>> }> {
    return apiClient.get('/auth/devices');
  },

  async registerDevice(payload: {
    platform: 'android' | 'ios' | 'web';
    devicePublicId?: string;
    appVersion?: string;
    osVersion?: string;
    model?: string;
  }): Promise<Record<string, unknown>> {
    return apiClient.post('/auth/devices', payload);
  },

  async revokeDevice(deviceId: string): Promise<{ changed?: boolean }> {
    return apiClient.delete(`/auth/devices/${deviceId}`);
  },
};

export default authService;
