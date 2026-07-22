import type { BackendResponse, ApiError } from './types';
import { getApiBase } from './runtimeConfig';

interface RequestConfig {
  timeout?: number;
}

class ApiClient {
  private readonly defaultTimeout = 30000;

  private async request<T>(
    method: string,
    url: string,
    data?: unknown,
    params?: Record<string, any>,
    config?: RequestConfig,
  ): Promise<BackendResponse<T>> {
    const target = new URL(url, getApiBase());
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) target.searchParams.set(key, String(value));
      });
    }

    const controller = new AbortController();
    const timeoutMs = config?.timeout ?? this.defaultTimeout;
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(target.toString(), {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: data === undefined ? undefined : JSON.stringify(data),
        signal: controller.signal,
      });

      const text = await response.text();
      const payload = text ? JSON.parse(text) : {};

      if (!response.ok) {
        throw {
          message: payload?.message || response.statusText || 'An error occurred',
          status: response.status,
          errors: payload?.errors,
        } satisfies ApiError;
      }

      return {
        success: !payload?.error,
        message: payload?.message,
        data: payload?.data,
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw {
          message: `Request timed out after ${Math.round(timeoutMs / 1000)}s`,
          status: 408,
        } satisfies ApiError;
      }

      if (typeof err?.status === 'number') throw err;

      throw {
        message: err?.message || 'An error occurred',
        status: 500,
        errors: err?.errors,
      } satisfies ApiError;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  async get<T>(
    url: string,
    params?: Record<string, any>,
    config?: RequestConfig,
  ): Promise<BackendResponse<T>> {
    return this.request<T>('GET', url, undefined, params, config);
  }

  async post<T>(url: string, data?: any): Promise<BackendResponse<T>> {
    return this.request<T>('POST', url, data);
  }

  async put<T>(url: string, data?: any): Promise<BackendResponse<T>> {
    return this.request<T>('PUT', url, data);
  }

  async patch<T>(url: string, data?: any): Promise<BackendResponse<T>> {
    return this.request<T>('PATCH', url, data);
  }

  async delete<T>(url: string): Promise<BackendResponse<T>> {
    return this.request<T>('DELETE', url);
  }
}

export const apiClient = new ApiClient();
export default apiClient;
