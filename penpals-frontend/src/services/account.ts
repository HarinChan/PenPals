// Account management service

import { ApiClient } from './api';
import { User, Classroom } from './auth';

export interface AccountDetails {
  account: User & { classroom_count: number };
  classrooms: Classroom[];
}

export interface AccountStats {
  account_id: number;
  total_classrooms: number;
  total_connections: number;
  unique_interests: number;
  account_created: string;
}

export interface UpdateAccountData {
  email?: string;
  password?: string;
  organization?: string;
}

/**
 * Account management service
 */
export class AccountService {
  /**
   * Get current account details with all classrooms
   */
  static async getAccountDetails(): Promise<AccountDetails> {
    return ApiClient.get<AccountDetails>('/account');
  }

  /**
   * Update account information
   */
  static async updateAccount(data: UpdateAccountData): Promise<{
    msg: string;
    account: User;
  }> {
    return ApiClient.put('/account', data);
  }

  /**
   * Delete current account and all associated classrooms
   */
  static async deleteAccount(): Promise<{
    msg: string;
    deleted_classrooms: number;
  }> {
    const response = await ApiClient.delete('/account');
    
    // Clear token after successful deletion
    ApiClient.clearToken();
    
    return response;
  }

  /**
   * Get all classrooms for the current account
   */
  static async getAccountClassrooms(): Promise<{
    classrooms: (Classroom & { friends_count: number })[];
    total_count: number;
    account_id: number;
  }> {
    return ApiClient.get('/account/classrooms');
  }

  /**
   * Get account statistics
   */
  static async getAccountStats(): Promise<AccountStats> {
    return ApiClient.get<AccountStats>('/account/stats');
  }

  /**
   * Validate account update data
   */
  static validateUpdateData(data: UpdateAccountData): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (data.email !== undefined) {
      if (!data.email.trim()) {
        errors.push('Email cannot be empty');
      } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(data.email)) {
        errors.push('Invalid email format');
      }
    }

    if (data.organization !== undefined && data.organization.length > 120) {
      errors.push('Organization name too long (max 120 characters)');
    }

    if (data.password !== undefined) {
      if (data.password.length < 8) {
        errors.push('Password must be at least 8 characters long');
      }
      
      if (!/[A-Z]/.test(data.password)) {
        errors.push('Password must contain at least one uppercase letter');
      }
      
      if (!/[a-z]/.test(data.password)) {
        errors.push('Password must contain at least one lowercase letter');
      }
      
      if (!/\d/.test(data.password)) {
        errors.push('Password must contain at least one digit');
      }
      
      if (!/[^A-Za-z0-9]/.test(data.password)) {
        errors.push('Password must contain at least one special character');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}