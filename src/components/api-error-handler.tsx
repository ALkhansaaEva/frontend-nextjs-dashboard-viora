'use client';

import { type AxiosError } from 'axios';
import type { ApiError } from '@/types';

export class ApiErrorHandler {
  static normalize(error: unknown): ApiError {
    const axiosError = error as AxiosError<ApiError>;
    
    if (axiosError.response) {
      return {
        message: axiosError.response.data?.message || this.getMessage(axiosError.response.status),
        statusCode: axiosError.response.status,
        code: axiosError.response.data?.code,
      };
    }
    
    if (axiosError.request) {
      return {
        message: 'Network error. Please check your connection.',
        statusCode: 0,
        code: 'NETWORK_ERROR',
      };
    }
    
    return {
      message: axiosError.message || 'An unexpected error occurred',
      statusCode: 0,
      code: 'UNKNOWN_ERROR',
    };
  }

  private static getMessage(statusCode: number): string {
    const messages: Record<number, string> = {
      400: 'Bad request. Please check your input.',
      401: 'Your session has expired. Please login again.',
      403: 'You do not have permission to perform this action.',
      404: 'The requested resource was not found.',
      409: 'A conflict occurred. Please try again.',
      422: 'Validation failed. Please check your input.',
      429: 'Too many requests. Please wait a moment.',
      500: 'Server error. Please try again later.',
      502: 'Service unavailable. Please try again.',
      503: 'Service unavailable. Please try again later.',
    };
    
    return messages[statusCode] || 'An error occurred';
  }

  static isAuthError(error: ApiError): boolean {
    return error.statusCode === 401;
  }

  static isForbiddenError(error: ApiError): boolean {
    return error.statusCode === 403;
  }

  static isNotFoundError(error: ApiError): boolean {
    return error.statusCode === 404;
  }

  static isValidationError(error: ApiError): boolean {
    return error.statusCode === 422;
  }

  static isServerError(error: ApiError): boolean {
    return error.statusCode >= 500;
  }

  static getUserMessage(error: ApiError): string {
    if (error.code === 'USER_NOT_FOUND') {
      return 'User not found';
    }
    if (error.code === 'INVALID_CREDENTIALS') {
      return 'Invalid email or password';
    }
    if (error.code === 'EMAIL_EXISTS') {
      return 'This email is already registered';
    }
    if (error.code === 'TOKEN_EXPIRED') {
      return 'Your session has expired. Please login again.';
    }
    if (error.code === 'INSUFFICIENT_PERMISSIONS') {
      return 'You do not have permission to perform this action.';
    }
    
    return error.message;
  }
}

export function useApiError() {
  return ApiErrorHandler;
}

export default ApiErrorHandler;