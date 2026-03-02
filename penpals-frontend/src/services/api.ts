// Base API configuration and utilities
// /api/classroom CHNAGE TO /api/profile
// Setting for URL

const runtimeImportMeta = import.meta as ImportMeta & {
  env?: Record<string, string | undefined>;
};

const API_BASE_URL = runtimeImportMeta.env?.VITE_API_BASE_URL?.trim() || 'http://192.168.1.163:5001/api';

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

  private static buildFallbackUrl(url: string): string | null {
    try {
      const parsed = new URL(url);
      if (parsed.hostname === 'localhost') {
        parsed.hostname = '127.0.0.1';
        return parsed.toString();
      }
      return null;
    } catch {
      return null;
    }
  }

  private static async doFetch(url: string, options: RequestInit): Promise<Response> {
    try {
      return await fetch(url, options);
    } catch (error) {
      const fallbackUrl = this.buildFallbackUrl(url);
      if (fallbackUrl) {
        return await fetch(fallbackUrl, options);
      }
      throw error;
    }
  }

  private static isFormDataBody(body: BodyInit | null | undefined): boolean {
    if (!body) return false;
    if (typeof FormData === 'undefined') return false;

    return body instanceof FormData ||
      Object.prototype.toString.call(body) === '[object FormData]';
  }

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

    const headers = new Headers(options.headers || {});

    if (!this.isFormDataBody(options.body) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    try {
      const response = await this.doFetch(url, {
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
      const fallbackHint = url.includes('localhost')
        ? ' If you are on macOS, localhost can fail in WebView networking; 127.0.0.1 is used as a fallback.'
        : '';
      throw new ApiError(
        `${error instanceof Error ? error.message : 'Network error'}. Unable to reach backend API at ${url}.${fallbackHint}`,
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