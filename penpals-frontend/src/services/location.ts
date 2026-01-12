// Location geocoding service using Nominatim (OpenStreetMap)

export interface LocationSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  place_id: string;
  type: string;
  importance: number;
  address?: {
    city?: string;
    country?: string;
    state?: string;
    postcode?: string;
  };
}

export interface SelectedLocation {
  name: string;
  latitude: number;
  longitude: number;
  place_id: string;
}

/**
 * Location service for geocoding and reverse geocoding
 */
export class LocationService {
  private static readonly NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
  
  /**
   * Search for location suggestions based on query string
   */
  static async searchLocations(query: string): Promise<LocationSuggestion[]> {
    if (!query || query.length < 3) {
      return [];
    }

    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: '5',
        countrycodes: '', // Allow all countries
        'accept-language': 'en',
      });

      const response = await fetch(
        `${this.NOMINATIM_BASE_URL}/search?${params}`,
        {
          headers: {
            'User-Agent': 'PenPals-App/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }

      const results: LocationSuggestion[] = await response.json();
      
      // Filter and sort results by importance
      return results
        .filter(result => result.importance > 0.3) // Filter out less relevant results
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 5); // Limit to top 5 results

    } catch (error) {
      console.error('Location search error:', error);
      return [];
    }
  }

  /**
   * Get detailed location info from coordinates
   */
  static async reverseGeocode(latitude: number, longitude: number): Promise<LocationSuggestion | null> {
    try {
      const params = new URLSearchParams({
        lat: latitude.toString(),
        lon: longitude.toString(),
        format: 'json',
        addressdetails: '1',
        'accept-language': 'en',
      });

      const response = await fetch(
        `${this.NOMINATIM_BASE_URL}/reverse?${params}`,
        {
          headers: {
            'User-Agent': 'PenPals-App/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Reverse geocoding API error: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Format location suggestion for display
   */
  static formatLocationDisplay(suggestion: LocationSuggestion): string {
    const parts = suggestion.display_name.split(', ');
    
    // Try to create a concise, readable format
    if (suggestion.address) {
      const { city, state, country } = suggestion.address;
      if (city && country) {
        return state ? `${city}, ${state}, ${country}` : `${city}, ${country}`;
      }
    }
    
    // Fallback to first few parts of display_name
    return parts.slice(0, 3).join(', ');
  }

  /**
   * Convert LocationSuggestion to SelectedLocation
   */
  static suggestionToLocation(suggestion: LocationSuggestion): SelectedLocation {
    return {
      name: this.formatLocationDisplay(suggestion),
      latitude: parseFloat(suggestion.lat),
      longitude: parseFloat(suggestion.lon),
      place_id: suggestion.place_id,
    };
  }

  /**
   * Validate coordinates
   */
  static isValidCoordinates(lat: number, lng: number): boolean {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180 &&
      !isNaN(lat) &&
      !isNaN(lng)
    );
  }

  /**
   * Get popular cities as default suggestions
   */
  static getPopularCities(): SelectedLocation[] {
    return [
      { name: 'London, England, United Kingdom', latitude: 51.5074, longitude: -0.1278, place_id: 'london_uk' },
      { name: 'New York, New York, United States', latitude: 40.7128, longitude: -74.0060, place_id: 'nyc_us' },
      { name: 'Paris, France', latitude: 48.8566, longitude: 2.3522, place_id: 'paris_fr' },
      { name: 'Tokyo, Japan', latitude: 35.6762, longitude: 139.6503, place_id: 'tokyo_jp' },
      { name: 'Sydney, New South Wales, Australia', latitude: -33.8688, longitude: 151.2093, place_id: 'sydney_au' },
    ];
  }
}