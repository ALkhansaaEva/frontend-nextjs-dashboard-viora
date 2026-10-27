import axios, { AxiosError, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { isMfaRequiredError, requestMfaStepUp } from '@/lib/auth/mfa-gate';

const PROXY_BASE_URL = '/api/proxy';

// ponytail: same-origin proxy in every env. The gateway only allowlists its
// own origins (no ACAO for the dashboard host), so direct browser calls fail
// CORS; the proxy also persists httpOnly session cookies server-side.
const BASE_URL = PROXY_BASE_URL;

const REQUEST_TIMEOUT = 10000;
const MAX_RETRIES = 2;
const SLOW_REQUEST_THRESHOLD = 1000;

interface ApiError {
  message: string;
  statusCode: number;
  code?: string;
}

interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface RefreshedAuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user?: { id: string; email: string };
  roles?: string[];
  permissions?: string[];
}

interface CustomAxiosConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
  _startTime?: number;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidUUID(uuid: string): boolean {
  // Standard UUID v4
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(uuid)) return true;
  // ponytail: also accept cuid2 (backend uses it for media IDs)
  return /^[a-z0-9]{20,30}$/.test(uuid);
}

function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

function isValidString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export const ValidationUtils = {
  isValidEmail,
  isValidUUID,
  isValidNumber,
  isValidString,
};

export class ApiClient {
  // No default Content-Type. A bodyless request (every DELETE, and any GET with
  // query params) must not claim `application/json`: Fastify's JSON parser then
  // rejects the empty body with FST_ERR_CTP_EMPTY_JSON_BODY -> 400, so the
  // delete never happens. Axios sets `application/json` itself for object
  // bodies and lets the browser set the multipart boundary for FormData, which
  // is exactly the per-request behaviour this client needs.
  private client = axios.create({
    timeout: REQUEST_TIMEOUT,
  });

  private refreshPromise: Promise<RefreshedAuthSession> | null = null;

  constructor() {
    this.setupInterceptors();
  }

  private getBaseUrl(): string {
    return BASE_URL;
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      (config: CustomAxiosConfig) => {
        config.baseURL = this.getBaseUrl();
        config._startTime = Date.now();
        
        if (typeof window !== 'undefined') {
          const tokenExpiry = localStorage.getItem('tokenExpiry');
          const refreshToken = localStorage.getItem('refreshToken');
          
          const isRefreshRequest = config.url?.includes('/auth/refresh') ?? false;
          const isAuthRequest = config.url?.includes('/auth/') ?? false;

          if (!isRefreshRequest && !isAuthRequest && tokenExpiry && refreshToken) {
            const expiryTime = parseInt(tokenExpiry);
            const timeUntilExpiry = expiryTime - Date.now();
            
            if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
              this.refreshAuthSession().catch(() => {});
            }
            
            if (timeUntilExpiry <= 0) {
              this.refreshAuthSession().catch(() => {});
            }
          }
          
          const token = localStorage.getItem('accessToken');
          if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        const config = response.config as CustomAxiosConfig;
        const duration = Date.now() - (config._startTime || 0);
        if (duration > SLOW_REQUEST_THRESHOLD) {
          console.warn(`[Slow Request] ${config.method?.toUpperCase()} ${config.url} took ${duration}ms`);
        }

        return response;
      },
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as CustomAxiosConfig;
        const retryCount = originalRequest?._retryCount || 0;

        const isAuthRequest = originalRequest?.url?.includes('/auth/') ?? false;

        if (isMfaRequiredError(error)) {
          requestMfaStepUp();
        }

        if (error.response?.status === 401 && originalRequest && retryCount < MAX_RETRIES && !isAuthRequest) {
          originalRequest._retryCount = retryCount + 1;

          try {
            const { accessToken: newToken } = await this.refreshAuthSession();
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return this.client(originalRequest);
          } catch {
            // A concurrent refresh may have already rotated the tokens while
            // this request was failing — retry once with whatever is current
            // in storage before declaring the session dead.
            const currentToken =
              typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
            const sentToken = originalRequest.headers?.Authorization
              ? String(originalRequest.headers.Authorization).replace(/^Bearer\s+/i, '')
              : null;
            if (currentToken && currentToken !== sentToken) {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${currentToken}`;
              }
              return this.client(originalRequest);
            }
            this.clearTokens();
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            return Promise.reject(error);
          }
        }

        if (error.request && !error.response && retryCount < MAX_RETRIES) {
          const delay = 1000 * (retryCount + 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          originalRequest._retryCount = retryCount + 1;
          
          try {
            return await this.client(originalRequest);
          } catch (retryError) {
            return Promise.reject(this.normalizeError(retryError as AxiosError<ApiError>));
          }
        }

        return Promise.reject(this.normalizeError(error));
      }
    );
  }

  public async refreshAuthSession(): Promise<RefreshedAuthSession> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      try {
        const baseUrl = BASE_URL;
        const response = await axios.post<ApiResponse<RefreshedAuthSession>>(
          `${baseUrl}/auth/refresh`,
          { refreshToken },
          { timeout: 10000 }
        );

        const session = (response.data.data || response.data) as RefreshedAuthSession;

        // Account-switch guard: if the stored refresh token changed while this
        // request was in flight (logout/login as another account), discard the
        // stale response instead of overwriting the newer session's tokens.
        if (localStorage.getItem('refreshToken') !== refreshToken) {
          throw new Error('Authentication session changed during refresh');
        }

        const { accessToken, refreshToken: newRefreshToken, expiresIn } = session;
        
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        
        const expiryTime = Date.now() + (expiresIn * 1000);
        localStorage.setItem('tokenExpiry', expiryTime.toString());

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:tokenRefreshed', { 
            detail: { accessToken, refreshToken: newRefreshToken } 
          }));
        }
        
        return session;
      } catch (error) {
        // A failed refresh must NOT wipe the session here: refresh calls are
        // fire-and-forget from the request interceptor and can race with a
        // concurrent successful refresh (token rotation makes the loser's
        // token invalid). The authoritative path is the 401 response
        // interceptor, which retries with fresh/current tokens and only
        // clears the session when the request is genuinely unauthenticated.
        console.error('[API] Token refresh failed:', error);
        throw error;
      }
    })();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private normalizeError(error: AxiosError<ApiError>): ApiError {
    if (axios.isCancel(error)) {
      return { message: 'Request cancelled', statusCode: 0, code: 'CANCELLED' };
    }
    if (error.response) {
      const data =
        error.response.data && typeof error.response.data === 'object'
          ? (error.response.data as unknown as Record<string, unknown>)
          : {};
      const nestedError = data.error;
      const errPayload =
        nestedError && typeof nestedError === 'object'
          ? (nestedError as Record<string, unknown>)
          : data;
      const backendMessage =
        typeof errPayload.message === 'string'
          ? errPayload.message
          : typeof data.message === 'string'
            ? data.message
            : undefined;
      const backendCode =
        typeof errPayload.code === 'string'
          ? errPayload.code
          : typeof data.code === 'string'
            ? data.code
            : undefined;
      const statusMessages: Record<number, string> = {
        400: 'Invalid request. Please check your input.',
        403: 'You do not have permission to perform this action.',
        404: 'The requested resource was not found.',
        409: 'Conflict. The resource already exists or is in an invalid state.',
        422: backendMessage || 'Validation failed. Please check your input.',
        429: 'Too many requests. Please wait and try again.',
        500: 'Server error. Please try again later.',
        502: 'Service temporarily unavailable. Please try again.',
        503: 'Service is under maintenance. Please try again later.',
      };
      return {
        message: backendMessage || statusMessages[error.response.status] || error.message || 'An error occurred',
        statusCode: error.response.status,
        code: backendCode,
      };
    }
    if (error.request) {
      const isTimeout = error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout');
      return {
        message: isTimeout ? 'Request timed out. Please try again.' : 'Network error. Please check your connection.',
        statusCode: 0,
        code: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
      };
    }
    return {
      message: error.message || 'An unexpected error occurred',
      statusCode: 0,
      code: error.code || 'UNEXPECTED_ERROR',
    };
  }

  private clearTokens() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  private validateParams(params?: Record<string, unknown>): boolean {
    if (!params) return true;
    
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) {
        continue;
      }
      
      // ponytail: skip strict ID validation — backend handles it
      // Only check that it's a non-empty string if provided
      if ((key.includes('Id') || key === 'id' || key === 'userId') && isValidString(value)) {
        // warn but don't block — backend may use cuid2, nanoid, etc.
        if (!isValidUUID(value as string)) {
          console.warn(`Non-UUID ID param: ${key}=${value}`);
        }
      }
      
      if (key === 'email' && !isValidEmail(value as string)) {
        console.warn(`Invalid email param: ${key}`, value);
        return false;
      }
    }
    
    return true;
  }

  private unwrap<T>(data: unknown): T {
    if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
      return (data as Record<string, unknown>).data as T;
    }
    return data as T;
  }

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return this.unwrap<T>(response.data);
  }

  public async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    if (!this.validateParams(data as Record<string, unknown>)) {
      throw new Error('Invalid request parameters');
    }

    const response = await this.client.post<T>(url, data, config);
    return this.unwrap<T>(response.data);
  }

  public async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    if (!this.validateParams(data as Record<string, unknown>)) {
      throw new Error('Invalid request parameters');
    }

    const response = await this.client.put<T>(url, data, config);
    return this.unwrap<T>(response.data);
  }

  public async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    if (!this.validateParams(data as Record<string, unknown>)) {
      throw new Error('Invalid request parameters');
    }

    const response = await this.client.patch<T>(url, data, config);
    return this.unwrap<T>(response.data);
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return this.unwrap<T>(response.data);
  }

  public setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', token);
    }
  }

  public clearToken(): void {
    this.clearTokens();
  }

  public getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  }

  public hasToken(): boolean {
    return this.getToken() !== null;
  }
}

export const apiClient = new ApiClient();
export const validationUtils = ValidationUtils;
export default apiClient;
