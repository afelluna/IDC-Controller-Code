import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type { BackendResponse, ApiError } from './types';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Response interceptor - Normalize backend response format
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        const { error, message, data } = response.data;
        
        // Normalize { error, message, data } -> { success, message, data }
        response.data = {
          success: !error,
          message,
          data
        };
        
        return response;
      },
      (error) => {
        const apiError: ApiError = {
          message: error.response?.data?.message || error.message || 'An error occurred',
          status: error.response?.status || 500,
          errors: error.response?.data?.errors,
        };

        return Promise.reject(apiError);
      }
    );
  }

  // Generic HTTP methods
  async get<T>(url: string, params?: Record<string, any>): Promise<BackendResponse<T>> {
    const response = await this.client.get<BackendResponse<T>>(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<BackendResponse<T>> {
    const response = await this.client.post<BackendResponse<T>>(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<BackendResponse<T>> {
    const response = await this.client.put<BackendResponse<T>>(url, data);
    return response.data;
  }

  async patch<T>(url: string, data?: any): Promise<BackendResponse<T>> {
    const response = await this.client.patch<BackendResponse<T>>(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<BackendResponse<T>> {
    const response = await this.client.delete<BackendResponse<T>>(url);
    return response.data;
  }

  // Raw axios instance for custom requests
  get axiosInstance(): AxiosInstance {
    return this.client;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
