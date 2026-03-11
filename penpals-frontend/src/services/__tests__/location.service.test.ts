import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocationService, type LocationSuggestion } from '../location';

// Mock global fetch
global.fetch = vi.fn();

describe('LocationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchLocations', () => {
    it('returns empty array for queries shorter than 3 characters', async () => {
      const result1 = await LocationService.searchLocations('');
      const result2 = await LocationService.searchLocations('ab');

      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('searches locations and returns filtered, sorted results', async () => {
      const mockResponse: LocationSuggestion[] = [
        {
          display_name: 'Paris, France',
          lat: '48.8566',
          lon: '2.3522',
          place_id: 'paris_1',
          type: 'city',
          importance: 0.9,
          address: { city: 'Paris', country: 'France' },
        },
        {
          display_name: 'Paris, Texas, USA',
          lat: '33.6609',
          lon: '-95.5555',
          place_id: 'paris_2',
          type: 'city',
          importance: 0.5,
        },
        {
          display_name: 'Low importance location',
          lat: '10.0',
          lon: '20.0',
          place_id: 'low_importance',
          type: 'unknown',
          importance: 0.2,
        },
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await LocationService.searchLocations('Paris');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://nominatim.openstreetmap.org/search?'),
        expect.objectContaining({
          headers: {
            'User-Agent': 'PenPals-App/1.0',
          },
        })
      );

      // Should filter out low importance (< 0.3) and sort by importance descending
      expect(result).toHaveLength(2);
      expect(result[0].place_id).toBe('paris_1');
      expect(result[0].importance).toBe(0.9);
      expect(result[1].place_id).toBe('paris_2');
      expect(result[1].importance).toBe(0.5);
    });

    it('limits results to top 5', async () => {
      const mockResponse: LocationSuggestion[] = Array.from({ length: 10 }, (_, i) => ({
        display_name: `Location ${i}`,
        lat: `${i}`,
        lon: `${i}`,
        place_id: `loc_${i}`,
        type: 'city',
        importance: 0.9 - i * 0.05,
      }));

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await LocationService.searchLocations('test query');

      expect(result).toHaveLength(5);
    });

    it('returns empty array when fetch response is not ok', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const result = await LocationService.searchLocations('error query');

      expect(result).toEqual([]);
    });

    it('returns empty array when fetch throws error', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const result = await LocationService.searchLocations('network fail');

      expect(result).toEqual([]);
    });
  });

  describe('reverseGeocode', () => {
    it('reverse geocodes coordinates and returns location', async () => {
      const mockResponse: LocationSuggestion = {
        display_name: 'London, England, UK',
        lat: '51.5074',
        lon: '-0.1278',
        place_id: 'london_1',
        type: 'city',
        importance: 0.95,
        address: { city: 'London', country: 'United Kingdom' },
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await LocationService.reverseGeocode(51.5074, -0.1278);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://nominatim.openstreetmap.org/reverse?'),
        expect.objectContaining({
          headers: {
            'User-Agent': 'PenPals-App/1.0',
          },
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('returns null when fetch response is not ok', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      const result = await LocationService.reverseGeocode(0, 0);

      expect(result).toBeNull();
    });

    it('returns null when fetch throws error', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Connection timeout'));

      const result = await LocationService.reverseGeocode(40.7128, -74.006);

      expect(result).toBeNull();
    });
  });

  describe('formatLocationDisplay', () => {
    it('formats location with city, state, and country', () => {
      const suggestion: LocationSuggestion = {
        display_name: 'Full Address, City, State, Country, Extra',
        lat: '0',
        lon: '0',
        place_id: 'test',
        type: 'city',
        importance: 0.5,
        address: {
          city: 'San Francisco',
          state: 'California',
          country: 'United States',
        },
      };

      const result = LocationService.formatLocationDisplay(suggestion);

      expect(result).toBe('San Francisco, California, United States');
    });

    it('formats location with city and country when no state', () => {
      const suggestion: LocationSuggestion = {
        display_name: 'Full Address, City, Country',
        lat: '0',
        lon: '0',
        place_id: 'test',
        type: 'city',
        importance: 0.5,
        address: {
          city: 'Paris',
          country: 'France',
        },
      };

      const result = LocationService.formatLocationDisplay(suggestion);

      expect(result).toBe('Paris, France');
    });

    it('falls back to first 3 parts of display_name when address is incomplete', () => {
      const suggestion: LocationSuggestion = {
        display_name: 'Part1, Part2, Part3, Part4, Part5',
        lat: '0',
        lon: '0',
        place_id: 'test',
        type: 'city',
        importance: 0.5,
        address: {},
      };

      const result = LocationService.formatLocationDisplay(suggestion);

      expect(result).toBe('Part1, Part2, Part3');
    });

    it('falls back when address is missing', () => {
      const suggestion: LocationSuggestion = {
        display_name: 'Location A, Location B, Location C',
        lat: '0',
        lon: '0',
        place_id: 'test',
        type: 'city',
        importance: 0.5,
      };

      const result = LocationService.formatLocationDisplay(suggestion);

      expect(result).toBe('Location A, Location B, Location C');
    });
  });

  describe('suggestionToLocation', () => {
    it('converts LocationSuggestion to SelectedLocation', () => {
      const suggestion: LocationSuggestion = {
        display_name: 'Tokyo, Japan',
        lat: '35.6762',
        lon: '139.6503',
        place_id: 'tokyo_123',
        type: 'city',
        importance: 0.9,
        address: {
          city: 'Tokyo',
          country: 'Japan',
        },
      };

      const result = LocationService.suggestionToLocation(suggestion);

      expect(result).toEqual({
        name: 'Tokyo, Japan',
        latitude: 35.6762,
        longitude: 139.6503,
        place_id: 'tokyo_123',
      });
    });
  });

  describe('isValidCoordinates', () => {
    it('returns true for valid coordinates', () => {
      expect(LocationService.isValidCoordinates(51.5074, -0.1278)).toBe(true);
      expect(LocationService.isValidCoordinates(0, 0)).toBe(true);
      expect(LocationService.isValidCoordinates(-90, -180)).toBe(true);
      expect(LocationService.isValidCoordinates(90, 180)).toBe(true);
    });

    it('returns false for out-of-range latitude', () => {
      expect(LocationService.isValidCoordinates(-91, 0)).toBe(false);
      expect(LocationService.isValidCoordinates(91, 0)).toBe(false);
    });

    it('returns false for out-of-range longitude', () => {
      expect(LocationService.isValidCoordinates(0, -181)).toBe(false);
      expect(LocationService.isValidCoordinates(0, 181)).toBe(false);
    });

    it('returns false for NaN values', () => {
      expect(LocationService.isValidCoordinates(NaN, 0)).toBe(false);
      expect(LocationService.isValidCoordinates(0, NaN)).toBe(false);
      expect(LocationService.isValidCoordinates(NaN, NaN)).toBe(false);
    });

    it('returns false for non-number types', () => {
      expect(LocationService.isValidCoordinates('50' as any, 0)).toBe(false);
      expect(LocationService.isValidCoordinates(0, '10' as any)).toBe(false);
    });
  });

  describe('getPopularCities', () => {
    it('returns array of 5 popular cities', () => {
      const cities = LocationService.getPopularCities();

      expect(cities).toHaveLength(5);
      expect(cities[0].name).toBe('London, England, United Kingdom');
      expect(cities[1].name).toBe('New York, New York, United States');
      expect(cities[2].name).toBe('Paris, France');
      expect(cities[3].name).toBe('Tokyo, Japan');
      expect(cities[4].name).toBe('Sydney, New South Wales, Australia');
    });

    it('returns cities with valid coordinates', () => {
      const cities = LocationService.getPopularCities();

      cities.forEach((city) => {
        expect(LocationService.isValidCoordinates(city.latitude, city.longitude)).toBe(true);
      });
    });

    it('returns cities with all required properties', () => {
      const cities = LocationService.getPopularCities();

      cities.forEach((city) => {
        expect(city).toHaveProperty('name');
        expect(city).toHaveProperty('latitude');
        expect(city).toHaveProperty('longitude');
        expect(city).toHaveProperty('place_id');
      });
    });
  });
});
