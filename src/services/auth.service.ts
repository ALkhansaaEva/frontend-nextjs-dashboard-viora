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
    const raw = await apiClient.post<any>('/auth/email/login', validated);
    const data = (raw && typeof raw === 'object' && 'success' in raw && 'data' in raw) ? raw.data : raw;
    return data as AuthLoginResponse;
  },

  async register(credentials: RegisterRequest): Promise<AuthLoginResponse> {
    const validated = RegisterSchema.parse(credentials);
    return apiClient.post<AuthLoginResponse>('/auth/email/register', validated);
  },

  async requestEmailOTP(email: string): Promise<void> {
    await apiClient.post('/auth/email/request-otp', { email });
  },

  async verifyEmailOTP(email: string, otp: string): Promise<void> {
    const validated = OTPVerifySchema.parse({ email, otp });
    await apiClient.post('/auth/email/verify-otp', validated);
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

  async verifyPhoneOTP(phone: string, otp: string): Promise<void> {
    const validated = OTPVerifySchema.parse({ phone, otp });
    await apiClient.post('/auth/phone/verify-otp', validated);
  },

  async enrollMFA(): Promise<MFAEnrollResponse> {
    return apiClient.post<MFAEnrollResponse>('/auth/mfa/enroll');
  },

  async verifyEnableMFA(code: string): Promise<void> {
    await apiClient.post('/auth/mfa/verify-enable', { code });
  },

  async getGoogleOAuthUrl(): Promise<string> {
    const response = await apiClient.get<OAuthUrlResponse>('/auth/google/url');
    return response.url;
  },

  async verifyGoogleCallback(code: string, redirectUri?: string): Promise<AuthLoginResponse> {
    return apiClient.post<AuthLoginResponse>('/auth/google/callback', { code, redirectUri });
  },

  async getFacebookOAuthUrl(): Promise<string> {
    const response = await apiClient.get<OAuthUrlResponse>('/auth/facebook/url');
    return response.url;
  },

  async verifyFacebookCallback(code: string, redirectUri?: string): Promise<AuthLoginResponse> {
    return apiClient.post<AuthLoginResponse>('/auth/facebook/callback', { code, redirectUri });
  },

  async linkProvider(provider: string, code: string): Promise<void> {
    await apiClient.post('/auth/link-provider', { provider, code });
  },

  async registerFCMToken(token: string): Promise<void> {
    await apiClient.post('/auth/devices/fcm-token', { token });
  },
};

export default authService;