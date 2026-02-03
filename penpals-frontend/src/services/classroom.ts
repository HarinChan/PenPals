// Classroom management service

import { ApiClient } from './api';

export interface CreateClassroomData {
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
}

export interface UpdateClassroomData extends Partial<CreateClassroomData> { }

export interface ClassroomDetails {
  id: number;
  account_id?: number;
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
  friends?: ClassroomFriend[];
  friends_count?: number;
  created_at?: string;
}

export interface ClassroomFriend {
  id: number;
  name: string;
  location?: string;
  interests: string[];
  friends_since: string;
  interest_similarity?: number;
}

export interface SearchClassroomsData {
  interests: string[];
  n_results?: number;
}

export interface SearchResult extends ClassroomDetails {
  similarity_score: number;
  manual_similarity: number;
}

export interface SearchResponse {
  matched_classrooms: SearchResult[];
  search_query: string;
  total_results: number;
}

export interface ConnectClassroomsData {
  from_classroom_id: number;
}

/**
 * Classroom management service
 */
export class ClassroomService {
  /**
   * Create a new classroom
   */
  static async createClassroom(data: CreateClassroomData): Promise<{
    msg: string;
    classroom: ClassroomDetails;
  }> {
    return ApiClient.post('/classrooms', data);
  }

  /**
   * Get classroom details by ID
   */
  static async getClassroom(classroomId: number): Promise<{
    classroom: ClassroomDetails;
  }> {
    return ApiClient.get(`/classrooms/${classroomId}`);
  }

  /**
   * Update classroom information
   */
  static async updateClassroom(
    classroomId: number,
    data: UpdateClassroomData
  ): Promise<{
    msg: string;
    classroom: ClassroomDetails;
  }> {
    return ApiClient.put(`/classrooms/${classroomId}`, data);
  }

  /**
   * Delete classroom
   */
  static async deleteClassroom(classroomId: number): Promise<{
    msg: string;
    deleted_connections: number;
  }> {
    return ApiClient.delete(`/classrooms/${classroomId}`);
  }

  /**
   * Get all classrooms
   */
  static async getAllClassrooms(limit: number = 50): Promise<{
    classrooms: ClassroomDetails[];
    count: number;
  }> {
    return ApiClient.get(`/classrooms?limit=${limit}`);
  }

  /**
   * Search for classrooms by interests
   */
  static async searchClassrooms(data: SearchClassroomsData): Promise<SearchResponse> {
    return ApiClient.post<SearchResponse>('/classrooms/search', data);
  }

  /**
   * Connect two classrooms as friends
   */
  static async connectClassrooms(
    targetClassroomId: number,
    data: ConnectClassroomsData
  ): Promise<{
    msg: string;
    connection: {
      from_classroom: string;
      to_classroom: string;
      connected_at: string;
    };
  }> {
    return ApiClient.post(`/classrooms/${targetClassroomId}/connect`, data);
  }

  /**
   * Get all friends for a classroom
   */
  static async getClassroomFriends(classroomId: number): Promise<{
    classroom_id: number;
    classroom_name: string;
    friends: ClassroomFriend[];
    friends_count: number;
  }> {
    return ApiClient.get(`/classrooms/${classroomId}/friends`);
  }

  /**
   * Disconnect two classrooms
   */
  static async disconnectClassrooms(
    targetClassroomId: number,
    data: ConnectClassroomsData
  ): Promise<{
    msg: string;
  }> {
    return ApiClient.delete(`/classrooms/${targetClassroomId}/disconnect`, data);
  }

  /**
   * Validate classroom data
   */
  static validateClassroomData(data: CreateClassroomData | UpdateClassroomData): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate name (required for create, optional for update)
    if ('name' in data && data.name !== undefined) {
      if (!data.name.trim()) {
        errors.push('Classroom name is required');
      } else if (data.name.length > 100) {
        errors.push('Classroom name too long (max 100 characters)');
      }
    }

    // Validate coordinates
    if (data.latitude !== undefined || data.longitude !== undefined) {
      const lat = data.latitude ? parseFloat(data.latitude) : null;
      const lng = data.longitude ? parseFloat(data.longitude) : null;

      if (lat !== null && (isNaN(lat) || lat < -90 || lat > 90)) {
        errors.push('Invalid latitude (must be between -90 and 90)');
      }

      if (lng !== null && (isNaN(lng) || lng < -180 || lng > 180)) {
        errors.push('Invalid longitude (must be between -180 and 180)');
      }
    }

    // Validate class size
    if (data.class_size !== undefined) {
      if (data.class_size < 1 || data.class_size > 100) {
        errors.push('Class size must be between 1 and 100');
      }
    }

    // Validate interests
    if (data.interests !== undefined) {
      if (!Array.isArray(data.interests)) {
        errors.push('Interests must be an array');
      } else if (data.interests.length > 10) {
        errors.push('Maximum 10 interests allowed');
      } else {
        for (const interest of data.interests) {
          if (typeof interest !== 'string' || interest.length > 50) {
            errors.push('Each interest must be a string with max 50 characters');
            break;
          }
        }
      }
    }

    // Validate availability
    if (data.availability !== undefined) {
      if (!Array.isArray(data.availability)) {
        errors.push('Availability must be an array');
      } else {
        for (const slot of data.availability) {
          if (!slot.day || !slot.time) {
            errors.push('Each availability slot must have day and time');
            break;
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize interests array
   */
  static sanitizeInterests(interests: string[]): string[] {
    if (!Array.isArray(interests)) return [];

    return interests
      .map(interest =>
        typeof interest === 'string'
          ? interest.trim().toLowerCase().replace(/\s+/g, ' ')
          : ''
      )
      .filter(interest => interest.length > 0 && interest.length <= 50)
      .slice(0, 10); // Limit to 10 interests
  }

  /**
   * Calculate interest similarity between two classrooms
   */
  static calculateInterestSimilarity(interests1: string[], interests2: string[]): number {
    if (!interests1.length || !interests2.length) return 0;

    const set1 = new Set(interests1.map(i => i.toLowerCase().trim()));
    const set2 = new Set(interests2.map(i => i.toLowerCase().trim()));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Format classroom for display
   */
  static formatClassroomForDisplay(classroom: ClassroomDetails): ClassroomDetails & {
    displayLocation: string;
    displayInterests: string;
    hasCoordinates: boolean;
  } {
    return {
      ...classroom,
      displayLocation: classroom.location || 'Location not specified',
      displayInterests: classroom.interests.join(', ') || 'No interests specified',
      hasCoordinates: !!(classroom.latitude && classroom.longitude),
    };
  }
}