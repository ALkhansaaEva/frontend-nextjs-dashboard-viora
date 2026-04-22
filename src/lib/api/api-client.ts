import axios, { AxiosError, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-fastify-nestjs-viora.vercel.app/v1';
const PROXY_BASE_URL = '/api/proxy';

const isDev = process.env.NODE_ENV === 'development';

const BASE_URL = isDev ? PROXY_BASE_URL : API_BASE_URL;

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

interface CustomAxiosConfig extends InternalAxiosRequestConfig {
  _requestId?: string;
  _retryCount?: number;
  _startTime?: number;
}

interface RetryConfig {
  _retryCount?: number;
}

const pendingRequests = new Map<string, AbortController>();

function generateRequestKey(config: AxiosRequestConfig): string {
  const { method, url, params, data } = config;
  return `${method}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}`;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
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
  private client = axios.create({
    timeout: REQUEST_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  private refreshPromise: Promise<string> | null = null;

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
          // Check if token is expired before request
          const tokenExpiry = localStorage.getItem('tokenExpiry');
          const refreshToken = localStorage.getItem('refreshToken');
          
          if (tokenExpiry && refreshToken) {
            const expiryTime = parseInt(tokenExpiry);
            const now = Date.now();
            const timeUntilExpiry = expiryTime - now;
            
            // If token expires in less than 5 minutes, refresh proactively
            if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
              console.log('[API] Token expiring soon, refreshing proactively...');
              this.refreshToken().catch(console.error);
            }
            
            // If token is expired, try to refresh
            if (timeUntilExpiry <= 0) {
              console.log('[API] Token expired, refreshing...');
              this.refreshToken().catch(console.error);
            }
          }
          
          const token = localStorage.getItem('accessToken');
          if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          // Send refresh token in header for proxy to use if needed
          if (refreshToken && config.headers) {
            config.headers['x-refresh-token'] = refreshToken;
          }
        }
        
        const requestKey = generateRequestKey(config);
        config._requestId = requestKey;
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        const config = response.config as CustomAxiosConfig;
        const requestKey = config?._requestId;
        if (requestKey) {
          pendingRequests.delete(requestKey);
        }

        const duration = Date.now() - (config._startTime || 0);
        if (duration > SLOW_REQUEST_THRESHOLD) {
          console.warn(`[Slow Request] ${config.method?.toUpperCase()} ${config.url} took ${duration}ms`);
        }

        return response;
      },
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as CustomAxiosConfig;
        const requestKey = originalRequest?._requestId;
        
        if (requestKey) {
          pendingRequests.delete(requestKey);
        }
        
        const retryCount = (originalRequest as RetryConfig)?._retryCount || 0;

        if (error.response?.status === 401 && originalRequest && retryCount < MAX_RETRIES) {
          originalRequest._retryCount = retryCount + 1;

          try {
            const newToken = await this.refreshToken();
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            this.clearTokens();
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
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

  private async refreshToken(): Promise<string> {
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
        const response = await axios.post<ApiResponse<{
          accessToken: string;
          refreshToken: string;
          expiresIn: number;
        }>>(
          `${baseUrl}/auth/refresh`,
          { refreshToken },
          { timeout: 10000 }
        );

        const { accessToken, refreshToken: newRefreshToken, expiresIn } = response.data.data;
        
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        
        const expiryTime = Date.now() + (expiresIn * 1000);
        localStorage.setItem('tokenExpiry', expiryTime.toString());

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:tokenRefreshed', { 
            detail: { accessToken, refreshToken: newRefreshToken } 
          }));
        }
        
        return accessToken;
      } catch (error) {
        console.error('[API] Token refresh failed:', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('tokenExpiry');
        
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
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
    if (error.response) {
      return {
        message: error.response.data?.message || 'An error occurred',
        statusCode: error.response.status,
        code: error.response.data?.code,
      };
    }
    if (error.request) {
      return {
        message: 'Network error. Please check your connection.',
        statusCode: 0,
        code: 'NETWORK_ERROR',
      };
    }
    return {
      message: error.message || 'Unknown error',
      statusCode: 0,
      code: 'UNKNOWN_ERROR',
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
      
      if (key.includes('Id') || key === 'id' || key === 'userId') {
        if (!isValidString(value) || !isValidUUID(value as string)) {
          console.warn(`Invalid UUID param: ${key}`, value);
          return false;
        }
      }
      
      if (key === 'email' && !isValidEmail(value as string)) {
        console.warn(`Invalid email param: ${key}`, value);
        return false;
      }
    }
    
    return true;
  }

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const requestKey = generateRequestKey({ method: 'GET', url, ...config });
    
    if (pendingRequests.has(requestKey)) {
      throw new Error('Duplicate request in progress');
    }

    const controller = new AbortController();
    pendingRequests.set(requestKey, controller);

    try {
      const response = await this.client.get<T>(url, {
        ...config,
        signal: controller.signal,
      });
      return response.data;
    } finally {
      pendingRequests.delete(requestKey);
    }
  }

  public async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    if (!this.validateParams(data as Record<string, unknown>)) {
      throw new Error('Invalid request parameters');
    }

    const requestKey = generateRequestKey({ method: 'POST', url, data, ...config });
    
    if (pendingRequests.has(requestKey)) {
      throw new Error('Duplicate request in progress');
    }

    const controller = new AbortController();
    pendingRequests.set(requestKey, controller);

    try {
      const response = await this.client.post<T>(url, data, {
        ...config,
        signal: controller.signal,
      });
      return response.data;
    } finally {
      pendingRequests.delete(requestKey);
    }
  }

  public async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    if (!this.validateParams(data as Record<string, unknown>)) {
      throw new Error('Invalid request parameters');
    }

    const requestKey = generateRequestKey({ method: 'PUT', url, data, ...config });
    
    if (pendingRequests.has(requestKey)) {
      throw new Error('Duplicate request in progress');
    }

    const controller = new AbortController();
    pendingRequests.set(requestKey, controller);

    try {
      const response = await this.client.put<T>(url, data, {
        ...config,
        signal: controller.signal,
      });
      return response.data;
    } finally {
      pendingRequests.delete(requestKey);
    }
  }

  public async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    if (!this.validateParams(data as Record<string, unknown>)) {
      throw new Error('Invalid request parameters');
    }

    const requestKey = generateRequestKey({ method: 'PATCH', url, data, ...config });
    
    if (pendingRequests.has(requestKey)) {
      throw new Error('Duplicate request in progress');
    }

    const controller = new AbortController();
    pendingRequests.set(requestKey, controller);

    try {
      const response = await this.client.patch<T>(url, data, {
        ...config,
        signal: controller.signal,
      });
      return response.data;
    } finally {
      pendingRequests.delete(requestKey);
    }
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const requestKey = generateRequestKey({ method: 'DELETE', url, ...config });
    
    if (pendingRequests.has(requestKey)) {
      throw new Error('Duplicate request in progress');
    }

    const controller = new AbortController();
    pendingRequests.set(requestKey, controller);

    try {
      const response = await this.client.delete<T>(url, {
        ...config,
        signal: controller.signal,
      });
      return response.data;
    } finally {
      pendingRequests.delete(requestKey);
    }
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