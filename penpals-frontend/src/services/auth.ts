// Authentication service

import { ApiClient } from './api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  organization?: string;
}

export interface AuthResponse {
  access_token: string;
  account_id: number;
}

export interface User {
  id: number;
  email: string;
  organization?: string;
  created_at: string;
}

export interface UserWithClassrooms {
  account: User & { classroom_count: number };
  classrooms: Classroom[];
}

export interface Classroom {
  id: number;
  name: string;
  location?: string;
  latitude?: string;
  longitude?: string;
  class_size?: number;
  availability?: Array<{
    day: string;
    time: string;
  }>;
  interests: string[];
  friends_count?: number;
  created_at?: string;
}

/**
 * Authentication service for PenPals
 */
export class AuthService {
  /**
   * Register a new account
   */
  static async register(data: RegisterData): Promise<{ account_id: number; msg: string }> {
    const response = await ApiClient.post('/auth/register', data);
    return response;
  }

  /**
   * Login with email and password
   */
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await ApiClient.post<AuthResponse>('/auth/login', credentials);
    
    // Store the token for future requests
    ApiClient.setToken(response.access_token);
    
    return response;
  }

  /**
   * Logout and clear stored token
   */
  static logout(): void {
    ApiClient.clearToken();
  }

  /**
   * Get current authenticated user info
   */
  static async getCurrentUser(): Promise<UserWithClassrooms> {
    return ApiClient.get<UserWithClassrooms>('/auth/me');
  }

  /**
   * Check if user is currently authenticated
   */
  static isAuthenticated(): boolean {
    return ApiClient.getToken() !== null;
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one digit');
    }
    
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }
}