import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClassroomService, type CreateClassroomData, type UpdateClassroomData } from '../classroom';
import { ApiClient } from '../api';

vi.mock('../api', () => ({
  ApiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('ClassroomService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('API methods', () => {
    describe('createClassroom', () => {
      it('posts classroom data and returns response', async () => {
        const classroomData: CreateClassroomData = {
          name: 'Test Classroom',
          location: 'New York',
          interests: ['science', 'art'],
        };

        const mockResponse = {
          msg: 'Classroom created',
          classroom: { id: 1, ...classroomData },
        };

        vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

        const result = await ClassroomService.createClassroom(classroomData);

        expect(ApiClient.post).toHaveBeenCalledWith('/classrooms', classroomData);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getClassroom', () => {
      it('gets classroom by id', async () => {
        const mockResponse = {
          classroom: {
            id: 42,
            name: 'Room 42',
            interests: ['math'],
          },
        };

        vi.mocked(ApiClient.get).mockResolvedValue(mockResponse as any);

        const result = await ClassroomService.getClassroom(42);

        expect(ApiClient.get).toHaveBeenCalledWith('/classrooms/42');
        expect(result).toEqual(mockResponse);
      });
    });

    describe('updateClassroom', () => {
      it('puts update data and returns response', async () => {
        const updateData: UpdateClassroomData = {
          name: 'Updated Name',
          description: 'New description',
        };

        const mockResponse = {
          msg: 'Classroom updated',
          classroom: { id: 10, ...updateData, interests: [] },
        };

        vi.mocked(ApiClient.put).mockResolvedValue(mockResponse as any);

        const result = await ClassroomService.updateClassroom(10, updateData);

        expect(ApiClient.put).toHaveBeenCalledWith('/classrooms/10', updateData);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('deleteClassroom', () => {
      it('deletes classroom and returns response', async () => {
        const mockResponse = { msg: 'Deleted', deleted_connections: 3 };

        vi.mocked(ApiClient.delete).mockResolvedValue(mockResponse as any);

        const result = await ClassroomService.deleteClassroom(99);

        expect(ApiClient.delete).toHaveBeenCalledWith('/classrooms/99');
        expect(result).toEqual(mockResponse);
      });
    });

    describe('fetchAllClassrooms', () => {
      it('fetches all classrooms for map', async () => {
        const mockResponse = {
          classrooms: [
            { id: '1', name: 'Room 1', location: 'NYC', lat: 40.7, lon: -74.0, interests: [], availability: {} },
          ],
        };

        vi.mocked(ApiClient.get).mockResolvedValue(mockResponse as any);

        const result = await ClassroomService.fetchAllClassrooms();

        expect(ApiClient.get).toHaveBeenCalledWith('/classrooms');
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getAllClassrooms', () => {
      it('gets all classrooms with default limit', async () => {
        const mockResponse = { classrooms: [], count: 0 };

        vi.mocked(ApiClient.get).mockResolvedValue(mockResponse as any);

        const result = await ClassroomService.getAllClassrooms();

        expect(ApiClient.get).toHaveBeenCalledWith('/classrooms?limit=50');
        expect(result).toEqual(mockResponse);
      });

      it('gets all classrooms with custom limit', async () => {
        const mockResponse = { classrooms: [], count: 0 };

        vi.mocked(ApiClient.get).mockResolvedValue(mockResponse as any);

        const result = await ClassroomService.getAllClassrooms(100);

        expect(ApiClient.get).toHaveBeenCalledWith('/classrooms?limit=100');
        expect(result).toEqual(mockResponse);
      });
    });

    describe('searchClassrooms', () => {
      it('posts search data and returns results', async () => {
        const searchData = { interests: ['music', 'art'], n_results: 10 };
        const mockResponse = {
          matched_classrooms: [],
          search_query: 'music, art',
          total_results: 0,
        };

        vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

        const result = await ClassroomService.searchClassrooms(searchData);

        expect(ApiClient.post).toHaveBeenCalledWith('/classrooms/search', searchData);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('connectClassrooms', () => {
      it('posts connect request and returns response', async () => {
        const mockResponse = {
          msg: 'Connected',
          connection: {
            from_classroom: 'Room 1',
            to_classroom: 'Room 2',
            connected_at: '2026-03-09T12:00:00Z',
          },
        };

        vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

        const result = await ClassroomService.connectClassrooms(2, { from_classroom_id: 1 });

        expect(ApiClient.post).toHaveBeenCalledWith('/classrooms/2/connect', { from_classroom_id: 1 });
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getClassroomFriends', () => {
      it('gets friends for classroom', async () => {
        const mockResponse = {
          classroom_id: 5,
          classroom_name: 'Room 5',
          friends: [],
          friends_count: 0,
        };

        vi.mocked(ApiClient.get).mockResolvedValue(mockResponse as any);

        const result = await ClassroomService.getClassroomFriends(5);

        expect(ApiClient.get).toHaveBeenCalledWith('/classrooms/5/friends');
        expect(result).toEqual(mockResponse);
      });
    });

    describe('disconnectClassrooms', () => {
      it('deletes connection and returns response', async () => {
        const mockResponse = { msg: 'Disconnected' };

        vi.mocked(ApiClient.delete).mockResolvedValue(mockResponse as any);

        const result = await ClassroomService.disconnectClassrooms(3, { from_classroom_id: 7 });

        expect(ApiClient.delete).toHaveBeenCalledWith('/classrooms/3/disconnect', { from_classroom_id: 7 });
        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('validateClassroomData', () => {
    it('validates successfully for valid create data', () => {
      const data: CreateClassroomData = {
        name: 'Valid Classroom',
        interests: ['math', 'science'],
      };

      const result = ClassroomService.validateClassroomData(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns error for empty name', () => {
      const data = { name: '   ', interests: [] };

      const result = ClassroomService.validateClassroomData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Classroom name is required');
    });

    it('returns error for name too long', () => {
      const data = { name: 'a'.repeat(101), interests: [] };

      const result = ClassroomService.validateClassroomData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Classroom name too long (max 100 characters)');
    });

    it('returns error for invalid latitude', () => {
      const data = { name: 'Test', latitude: '95', longitude: '0', interests: [] };

      const result = ClassroomService.validateClassroomData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid latitude (must be between -90 and 90)');
    });

    it('returns error for invalid longitude', () => {
      const data = { name: 'Test', latitude: '0', longitude: '200', interests: [] };

      const result = ClassroomService.validateClassroomData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid longitude (must be between -180 and 180)');
    });

    it('handles empty string latitude as null', () => {
      const data = { name: 'Test', latitude: '', longitude: '50', interests: [] };

      const result = ClassroomService.validateClassroomData(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('handles empty string longitude as null', () => {
      const data = { name: 'Test', latitude: '40', longitude: '', interests: [] };

      const result = ClassroomService.validateClassroomData(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('validates latitude with value 0', () => {
      const data = { name: 'Test', latitude: '0', longitude: '0', interests: [] };

      const result = ClassroomService.validateClassroomData(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns error for class size out of range', () => {
      const result1 = ClassroomService.validateClassroomData({ name: 'Test', class_size: 0, interests: [] });
      const result2 = ClassroomService.validateClassroomData({ name: 'Test', class_size: 101, interests: [] });

      expect(result1.errors).toContain('Class size must be between 1 and 100');
      expect(result2.errors).toContain('Class size must be between 1 and 100');
    });

    it('returns error for non-array interests', () => {
      const data = { name: 'Test', interests: 'not-array' as any };

      const result = ClassroomService.validateClassroomData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Interests must be an array');
    });

    it('returns error for too many interests', () => {
      const data = { name: 'Test', interests: Array(11).fill('interest') };

      const result = ClassroomService.validateClassroomData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Maximum 10 interests allowed');
    });

    it('returns error for interest string too long', () => {
      const data = { name: 'Test', interests: ['a'.repeat(51)] };

      const result = ClassroomService.validateClassroomData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Each interest must be a string with max 50 characters');
    });

    it('returns error for non-array availability', () => {
      const data = { name: 'Test', availability: 'not-array' as any, interests: [] };

      const result = ClassroomService.validateClassroomData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Availability must be an array');
    });

    it('returns error for invalid availability slot', () => {
      const data = { name: 'Test', availability: [{ day: 'Monday' }] as any, interests: [] };

      const result = ClassroomService.validateClassroomData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Each availability slot must have day and time');
    });
  });

  describe('sanitizeInterests', () => {
    it('sanitizes valid interests array', () => {
      const interests = ['  Math  ', 'SCIENCE', 'art   history'];

      const result = ClassroomService.sanitizeInterests(interests);

      expect(result).toEqual(['math', 'science', 'art history']);
    });

    it('filters out empty strings', () => {
      const interests = ['math', '   ', '', 'science'];

      const result = ClassroomService.sanitizeInterests(interests);

      expect(result).toEqual(['math', 'science']);
    });

    it('filters out strings longer than 50 characters', () => {
      const interests = ['math', 'a'.repeat(51), 'science'];

      const result = ClassroomService.sanitizeInterests(interests);

      expect(result).toEqual(['math', 'science']);
    });

    it('limits to 10 interests', () => {
      const interests = Array(15).fill('interest').map((v, i) => `${v}${i}`);

      const result = ClassroomService.sanitizeInterests(interests);

      expect(result).toHaveLength(10);
    });

    it('returns empty array for non-array input', () => {
      const result = ClassroomService.sanitizeInterests('not-array' as any);

      expect(result).toEqual([]);
    });

    it('filters out non-string values', () => {
      const interests = ['math', 123, null, 'science'] as any;

      const result = ClassroomService.sanitizeInterests(interests);

      expect(result).toEqual(['math', 'science']);
    });
  });

  describe('calculateInterestSimilarity', () => {
    it('calculates similarity for matching interests', () => {
      const interests1 = ['math', 'science', 'art'];
      const interests2 = ['math', 'science', 'music'];

      const result = ClassroomService.calculateInterestSimilarity(interests1, interests2);

      // Intersection: {math, science} = 2
      // Union: {math, science, art, music} = 4
      expect(result).toBeCloseTo(0.5);
    });

    it('returns 1 for identical interests', () => {
      const interests = ['math', 'science'];

      const result = ClassroomService.calculateInterestSimilarity(interests, interests);

      expect(result).toBe(1);
    });

    it('returns 0 for no matching interests', () => {
      const interests1 = ['math', 'science'];
      const interests2 = ['art', 'music'];

      const result = ClassroomService.calculateInterestSimilarity(interests1, interests2);

      expect(result).toBe(0);
    });

    it('returns 0 when first array is empty', () => {
      const result = ClassroomService.calculateInterestSimilarity([], ['math', 'science']);

      expect(result).toBe(0);
    });

    it('returns 0 when second array is empty', () => {
      const result = ClassroomService.calculateInterestSimilarity(['math', 'science'], []);

      expect(result).toBe(0);
    });

    it('handles case-insensitive comparison', () => {
      const interests1 = ['MATH', 'Science'];
      const interests2 = ['math', 'SCIENCE'];

      const result = ClassroomService.calculateInterestSimilarity(interests1, interests2);

      expect(result).toBe(1);
    });

    it('handles interests with whitespace', () => {
      const interests1 = ['  math  ', 'science'];
      const interests2 = ['math', 'science  '];

      const result = ClassroomService.calculateInterestSimilarity(interests1, interests2);

      expect(result).toBe(1);
    });
  });

  describe('formatClassroomForDisplay', () => {
    it('formats classroom with all fields', () => {
      const classroom = {
        id: 1,
        name: 'Room 1',
        location: 'New York',
        latitude: '40.7',
        longitude: '-74.0',
        interests: ['math', 'science'],
      };

      const result = ClassroomService.formatClassroomForDisplay(classroom as any);

      expect(result.displayLocation).toBe('New York');
      expect(result.displayInterests).toBe('math, science');
      expect(result.hasCoordinates).toBe(true);
    });

    it('handles missing location', () => {
      const classroom = {
        id: 1,
        name: 'Room 1',
        interests: ['math'],
      };

      const result = ClassroomService.formatClassroomForDisplay(classroom as any);

      expect(result.displayLocation).toBe('Location not specified');
    });

    it('handles empty interests', () => {
      const classroom = {
        id: 1,
        name: 'Room 1',
        interests: [],
      };

      const result = ClassroomService.formatClassroomForDisplay(classroom as any);

      expect(result.displayInterests).toBe('No interests specified');
    });

    it('sets hasCoordinates to false when missing coordinates', () => {
      const classroom = {
        id: 1,
        name: 'Room 1',
        interests: [],
      };

      const result = ClassroomService.formatClassroomForDisplay(classroom as any);

      expect(result.hasCoordinates).toBe(false);
    });

    it('sets hasCoordinates to false when only latitude is present', () => {
      const classroom = {
        id: 1,
        name: 'Room 1',
        latitude: '40.7',
        interests: [],
      };

      const result = ClassroomService.formatClassroomForDisplay(classroom as any);

      expect(result.hasCoordinates).toBe(false);
    });
  });
});
