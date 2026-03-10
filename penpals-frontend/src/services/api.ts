// Base API configuration and utilities
// /api/classroom CHNAGE TO /api/profile
// Setting for URL

const runtimeImportMeta = import.meta as ImportMeta & {
  env?: Record<string, string | undefined>;
};

const DEFAULT_API_BASE_URL = runtimeImportMeta.env?.VITE_API_BASE_URL?.trim() || 'http://127.0.0.1:5001/api';
const API_BASE_URL_STORAGE_KEY = 'penpals_api_base_url';
const API_BASE_URL_HISTORY_STORAGE_KEY = 'penpals_api_base_url_history';
const API_BASE_URL_HISTORY_LIMIT = 8;

const normalizeApiBaseUrl = (value: string): string => value.trim().replace(/\/+$/, '');

export const isValidApiBaseUrl = (value: string): boolean => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return false;
  }

  try {
    const parsed = new URL(trimmedValue);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const readStoredApiBaseUrl = (): string | null => {
  try {
    const storedValue = localStorage.getItem(API_BASE_URL_STORAGE_KEY);
    if (!storedValue) {
      return null;
    }

    return isValidApiBaseUrl(storedValue) ? normalizeApiBaseUrl(storedValue) : null;
  } catch {
    return null;
  }
};

const readStoredApiBaseUrlHistory = (): string[] => {
  try {
    const rawHistory = localStorage.getItem(API_BASE_URL_HISTORY_STORAGE_KEY);
    if (!rawHistory) {
      return [];
    }

    const parsedHistory = JSON.parse(rawHistory);
    if (!Array.isArray(parsedHistory)) {
      return [];
    }

    return parsedHistory
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => normalizeApiBaseUrl(entry))
      .filter((entry) => isValidApiBaseUrl(entry));
  } catch {
    return [];
  }
};

const writeStoredApiBaseUrlHistory = (history: string[]): void => {
  localStorage.setItem(API_BASE_URL_HISTORY_STORAGE_KEY, JSON.stringify(history));
};

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
  private static selectedBaseUrl: string | null | undefined = undefined;

  static getDefaultBaseUrl(): string {
    return normalizeApiBaseUrl(DEFAULT_API_BASE_URL);
  }

  static getSelectedBaseUrl(): string | null {
    return readStoredApiBaseUrl();
  }

  static getBaseUrlHistory(): string[] {
    return readStoredApiBaseUrlHistory();
  }

  static saveBaseUrlToHistory(baseUrl: string): void {
    if (!isValidApiBaseUrl(baseUrl)) {
      return;
    }

    const normalizedBaseUrl = normalizeApiBaseUrl(baseUrl);
    const history = readStoredApiBaseUrlHistory();
    const dedupedHistory = [normalizedBaseUrl, ...history.filter((entry) => entry !== normalizedBaseUrl)];
    writeStoredApiBaseUrlHistory(dedupedHistory.slice(0, API_BASE_URL_HISTORY_LIMIT));
  }

  static setBaseUrl(baseUrl: string): void {
    if (!isValidApiBaseUrl(baseUrl)) {
      throw new ApiError('Invalid API base URL', 0);
    }

    const normalizedBaseUrl = normalizeApiBaseUrl(baseUrl);
    this.selectedBaseUrl = normalizedBaseUrl;
    localStorage.setItem(API_BASE_URL_STORAGE_KEY, normalizedBaseUrl);
  }

  static clearBaseUrl(): void {
    this.selectedBaseUrl = null;
    localStorage.removeItem(API_BASE_URL_STORAGE_KEY);
  }

  static getBaseUrl(): string {
    if (this.selectedBaseUrl === undefined) {
      this.selectedBaseUrl = readStoredApiBaseUrl();
    }

    return this.selectedBaseUrl || this.getDefaultBaseUrl();
  }

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
    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}${endpoint}`;
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