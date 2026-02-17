// Base API configuration and utilities

//const API_BASE_URL = 'http://localhost:5001/api';
const API_BASE_URL = 'https://mirrormirrorwebapp-g8gke7g9dbfchpgr.uksouth-01.azurewebsites.net/api'

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Base API client with authentication support
 */
export class ApiClient {
  private static token: string | null = null;

  static setToken(token: string) {
    this.token = token;
    localStorage.setItem('penpals_token', token);
  }

  static getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('penpals_token');
    }
    return this.token;
  }

  static clearToken() {
    this.token = null;
    localStorage.removeItem('penpals_token');
  }

  static async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.msg || errorData.message || errorMessage;
        } catch {
          // If we can't parse the error response, use the status text
          errorMessage = response.statusText || errorMessage;
        }
        
        // If we get a 401, the token is likely expired
        if (response.status === 401) {
          this.clearToken();
        }
        
        throw new ApiError(errorMessage, response.status);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        0
      );
    }
  }

  static async get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  static async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  static async put<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  static async delete<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}