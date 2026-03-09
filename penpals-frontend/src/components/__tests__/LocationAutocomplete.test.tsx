import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LocationAutocomplete from '../LocationAutocomplete';
import { LocationService, type LocationSuggestion, type SelectedLocation } from '../../services/location';

vi.mock('../../services/location', () => ({
  LocationService: {
    searchLocations: vi.fn(),
    formatLocationDisplay: vi.fn(),
    suggestionToLocation: vi.fn(),
  },
}));

describe('LocationAutocomplete', () => {
  const mockOnChange = vi.fn();
  
  const mockSuggestions: LocationSuggestion[] = [
    {
      display_name: 'London, Greater London, England, United Kingdom',
      lat: '51.5074',
      lon: '-0.1278',
      place_id: 'london_1',
      type: 'city',
      importance: 0.9,
      address: { city: 'London', state: 'England', country: 'United Kingdom' },
    },
    {
      display_name: 'Paris, Île-de-France, France',
      lat: '48.8566',
      lon: '2.3522',
      place_id: 'paris_1',
      type: 'city',
      importance: 0.85,
      address: { city: 'Paris', country: 'France' },
    },
    {
      display_name: 'Tokyo, Japan',
      lat: '35.6762',
      lon: '139.6503',
      place_id: 'tokyo_1',
      type: 'city',
      importance: 0.88,
    },
  ];

  const mockSelectedLocation: SelectedLocation = {
    name: 'London, England, United Kingdom',
    latitude: 51.5074,
    longitude: -0.1278,
    place_id: 'london_1',
  };

  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    
    // Default mock implementations
    vi.mocked(LocationService.formatLocationDisplay).mockImplementation((suggestion) => {
      if (suggestion.address?.city) {
        const parts = [suggestion.address.city];
        if (suggestion.address.state) parts.push(suggestion.address.state);
        if (suggestion.address.country) parts.push(suggestion.address.country);
        return parts.join(', ');
      }
      return suggestion.display_name.split(', ').slice(0, 3).join(', ');
    });

    vi.mocked(LocationService.suggestionToLocation).mockImplementation((suggestion) => ({
      name: LocationService.formatLocationDisplay(suggestion),
      latitude: parseFloat(suggestion.lat),
      longitude: parseFloat(suggestion.lon),
      place_id: suggestion.place_id,
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders with label and placeholder', () => {
    render(
      <LocationAutocomplete
        label="Pick a location"
        placeholder="Type to search..."
        onChange={mockOnChange}
      />
    );

    expect(screen.getByLabelText('Pick a location')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type to search...')).toBeInTheDocument();
  });

  it('shows required indicator when required prop is true', () => {
    render(
      <LocationAutocomplete
        label="Location"
        onChange={mockOnChange}
        required={true}
      />
    );

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('displays helper text', () => {
    render(<LocationAutocomplete onChange={mockOnChange} />);

    expect(
      screen.getByText('Start typing to search for cities, countries, or addresses')
    ).toBeInTheDocument();
  });

  it('does not search when query is less than 3 characters', async () => {
    const user = userEvent.setup();

    render(<LocationAutocomplete onChange={mockOnChange} />);
    const input = screen.getByRole('textbox');

    await user.type(input, 'ab');

    // Wait for debounce
    await waitFor(() => {
      expect(LocationService.searchLocations).not.toHaveBeenCalled();
    }, { timeout: 500 });
  });

  it('searches locations after typing 3+ characters with debounce', async () => {
    const user = userEvent.setup();
    vi.mocked(LocationService.searchLocations).mockResolvedValue(mockSuggestions);

    render(<LocationAutocomplete onChange={mockOnChange} />);
    const input = screen.getByRole('textbox');

    await user.type(input, 'London');

    // Wait for debounce (300ms)
    await waitFor(
      () => {
        expect(LocationService.searchLocations).toHaveBeenCalledWith('London');
      },
      { timeout: 500 }
    );
  });

  it('displays suggestions dropdown after search', async () => {
    const user = userEvent.setup();
    vi.mocked(LocationService.searchLocations).mockResolvedValue(mockSuggestions);

    render(<LocationAutocomplete onChange={mockOnChange} />);
    const input = screen.getByRole('textbox');

    await user.type(input, 'London');

    await waitFor(() => {
      expect(screen.getByText('London, England, United Kingdom')).toBeInTheDocument();
    });

    expect(screen.getByText('Paris, France')).toBeInTheDocument();
    expect(screen.getByText('Tokyo, Japan')).toBeInTheDocument();
  });

  it('shows loading indicator while searching', async () => {
    const user = userEvent.setup();
    let resolveSearch: (value: LocationSuggestion[]) => void;
    const searchPromise = new Promise<LocationSuggestion[]>((resolve) => {
      resolveSearch = resolve;
    });
    vi.mocked(LocationService.searchLocations).mockReturnValue(searchPromise);

    render(<LocationAutocomplete onChange={mockOnChange} />);
    const input = screen.getByRole('textbox');

    await user.type(input, 'London');

    // Wait for debounce and loading state
    await waitFor(() => {
      const loader = document.querySelector('.animate-spin');
      expect(loader).toBeInTheDocument();
    }, { timeout: 500 });

    // Resolve the search
    resolveSearch!(mockSuggestions);

    // Loading should disappear
    await waitFor(() => {
      const loader = document.querySelector('.animate-spin');
      expect(loader).not.toBeInTheDocument();
    });
  });

  it('displays no results message when search returns empty', async () => {
    const user = userEvent.setup();
    vi.mocked(LocationService.searchLocations).mockResolvedValue([]);

    render(<LocationAutocomplete onChange={mockOnChange} />);
    const input = screen.getByRole('textbox');

    await user.type(input, 'xyz');

    await waitFor(() => {
      expect(screen.getByText('No locations found for "xyz"')).toBeInTheDocument();
    });
  });

  it('selects suggestion on click and calls onChange', async () => {
    const user = userEvent.setup();
    vi.mocked(LocationService.searchLocations).mockResolvedValue(mockSuggestions);

    render(<LocationAutocomplete onChange={mockOnChange} />);
    const input = screen.getByRole('textbox');

    await user.type(input, 'London');

    await waitFor(() => {
      expect(screen.getByText('London, England, United Kingdom')).toBeInTheDocument();
    });

    const suggestion = screen.getByText('London, England, United Kingdom');
    await user.click(suggestion);

    expect(LocationService.suggestionToLocation).toHaveBeenCalledWith(mockSuggestions[0]);
    expect(mockOnChange).toHaveBeenCalled();
  });

  it('closes suggestions dropdown after selection', async () => {
    const user = userEvent.setup();
    vi.mocked(LocationService.searchLocations).mockResolvedValue(mockSuggestions);

    render(<LocationAutocomplete onChange={mockOnChange} />);
    const input = screen.getByRole('textbox');

    await user.type(input, 'London');

    await waitFor(() => {
      expect(screen.getByText('London, England, United Kingdom')).toBeInTheDocument();
    });

    const suggestion = screen.getByText('London, England, United Kingdom');
    await user.click(suggestion);

    await waitFor(() => {
      expect(screen.queryByText('Paris, France')).not.toBeInTheDocument();
    });
  });

  it('navigates suggestions with arrow keys', async () => {
    const user = userEvent.setup();
    vi.mocked(LocationService.searchLocations).mockResolvedValue(mockSuggestions);

    render(<LocationAutocomplete onChange={mockOnChange} />);
    const input = screen.getByRole('textbox');

    await user.type(input, 'City');

    await waitFor(() => {
      expect(screen.getByText('London, England, United Kingdom')).toBeInTheDocument();
    });

    // Press ArrowDown
    await user.keyboard('{ArrowDown}');

    // First item should have highlight class
    const firstButton = screen.getByText('London, England, United Kingdom').closest('button');
    expect(firstButton).toHaveClass('bg-slate-100');

    // Press ArrowDown again
    await user.keyboard('{ArrowDown}');

    // Second item should be highlighted
    const secondButton = screen.getByText('Paris, France').closest('button');
    expect(secondButton).toHaveClass('bg-slate-100');

    // Press ArrowUp
    await user.keyboard('{ArrowUp}');

    // Back to first item
    expect(firstButton).toHaveClass('bg-slate-100');
  });

  it('selects suggestion with Enter key', async () => {
    const user = userEvent.setup();
    vi.mocked(LocationService.searchLocations).mockResolvedValue(mockSuggestions);

    render(<LocationAutocomplete onChange={mockOnChange} />);
    const input = screen.getByRole('textbox');

    await user.type(input, 'City');

    await waitFor(() => {
      expect(screen.getByText('London, England, United Kingdom')).toBeInTheDocument();
    });

    // Navigate to first item and press Enter
    await user.keyboard('{ArrowDown}{Enter}');

    expect(LocationService.suggestionToLocation).toHaveBeenCalledWith(mockSuggestions[0]);
    expect(mockOnChange).toHaveBeenCalled();
  });

  it('closes suggestions with Escape key', async () => {
    const user = userEvent.setup();
    vi.mocked(LocationService.searchLocations).mockResolvedValue(mockSuggestions);

    render(<LocationAutocomplete onChange={mockOnChange} />);
    const input = screen.getByRole('textbox');

    await user.type(input, 'City');

    await waitFor(() => {
      expect(screen.getByText('London, England, United Kingdom')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByText('London, England, United Kingdom')).not.toBeInTheDocument();
    });
  });

  it('highlights suggestion on mouse hover', async () => {
    const user = userEvent.setup();
    vi.mocked(LocationService.searchLocations).mockResolvedValue(mockSuggestions);

    render(<LocationAutocomplete onChange={mockOnChange} />);
    const input = screen.getByRole('textbox');

    await user.type(input, 'City');

    await waitFor(() => {
      expect(screen.getByText('Paris, France')).toBeInTheDocument();
    });

    const secondButton = screen.getByText('Paris, France').closest('button');
    await user.hover(secondButton!);

    expect(secondButton).toHaveClass('bg-slate-100');
  });

  it('clears selection when user modifies input', async () => {
    const user = userEvent.setup();
    vi.mocked(LocationService.searchLocations).mockResolvedValue(mockSuggestions);

    const { rerender } = render(
      <LocationAutocomplete value={mockSelectedLocation} onChange={mockOnChange} />
    );

    expect(screen.getByRole('textbox')).toHaveValue('London, England, United Kingdom');

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Paris');

    expect(mockOnChange).toHaveBeenCalledWith(null);
  });

  it('updates query when value prop changes', () => {
    const { rerender } = render(
      <LocationAutocomplete value={null} onChange={mockOnChange} />
    );

    expect(screen.getByRole('textbox')).toHaveValue('');

    rerender(
      <LocationAutocomplete value={mockSelectedLocation} onChange={mockOnChange} />
    );

    expect(screen.getByRole('textbox')).toHaveValue('London, England, United Kingdom');
  });

  it('does not search if query matches current selected location', async () => {
    const user = userEvent.setup();
    vi.mocked(LocationService.searchLocations).mockResolvedValue(mockSuggestions);

    render(
      <LocationAutocomplete value={mockSelectedLocation} onChange={mockOnChange} />
    );

    const input = screen.getByRole('textbox');
    
    // Focus input but don't change value
    await user.click(input);

    // Wait for debounce
    await waitFor(() => {
      expect(LocationService.searchLocations).not.toHaveBeenCalled();
    }, { timeout: 500 });
  });

  it('handles search error gracefully', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(LocationService.searchLocations).mockRejectedValue(new Error('API error'));

    render(<LocationAutocomplete onChange={mockOnChange} />);
    const input = screen.getByRole('textbox');

    await user.type(input, 'London');

    await waitFor(() => {
      expect(LocationService.searchLocations).toHaveBeenCalled();
    }, { timeout: 500 });

    // Should not crash and should show no results
    expect(screen.queryByText('London, England, United Kingdom')).not.toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it('shows suggestions on focus if there are cached results', async () => {
    const user = userEvent.setup();
    vi.mocked(LocationService.searchLocations).mockResolvedValue(mockSuggestions);

    render(<LocationAutocomplete onChange={mockOnChange} />);
    const input = screen.getByRole('textbox');

    // Type to get suggestions
    await user.type(input, 'London');

    await waitFor(() => {
      expect(screen.getByText('London, England, United Kingdom')).toBeInTheDocument();
    });

    // Blur input by clicking outside
    await user.click(document.body);

    // Wait for blur delay (150ms) and suggestions should be hidden
    await waitFor(
      () => {
        expect(screen.queryByText('London, England, United Kingdom')).not.toBeInTheDocument();
      },
      { timeout: 300 }
    );

    // Focus again
    await user.click(input);

    // Suggestions should reappear
    await waitFor(() => {
      expect(screen.getByText('London, England, United Kingdom')).toBeInTheDocument();
    });
  });

  it('applies custom className to input', () => {
    render(
      <LocationAutocomplete
        onChange={mockOnChange}
        className="custom-class"
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-class');
  });

  it('uses custom id prop', () => {
    render(
      <LocationAutocomplete
        onChange={mockOnChange}
        id="custom-location-input"
        label="Location"
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('id', 'custom-location-input');
    expect(screen.getByLabelText('Location')).toHaveAttribute('id', 'custom-location-input');
  });

  it('wraps to first suggestion when pressing ArrowDown at end', async () => {
    const user = userEvent.setup();
    vi.mocked(LocationService.searchLocations).mockResolvedValue(mockSuggestions);

    render(<LocationAutocomplete onChange={mockOnChange} />);
    const input = screen.getByRole('textbox');

    await user.type(input, 'City');

    await waitFor(() => {
      expect(screen.getByText('London, England, United Kingdom')).toBeInTheDocument();
    });

    // Navigate to last item
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');

    const thirdButton = screen.getByText('Tokyo, Japan').closest('button');
    expect(thirdButton).toHaveClass('bg-slate-100');

    // Press ArrowDown again - should wrap to first
    await user.keyboard('{ArrowDown}');

    const firstButton = screen.getByText('London, England, United Kingdom').closest('button');
    expect(firstButton).toHaveClass('bg-slate-100');
  });

  it('wraps to last suggestion when pressing ArrowUp at start', async () => {
    const user = userEvent.setup();
    vi.mocked(LocationService.searchLocations).mockResolvedValue(mockSuggestions);

    render(<LocationAutocomplete onChange={mockOnChange} />);
    const input = screen.getByRole('textbox');

    await user.type(input, 'City');

    await waitFor(() => {
      expect(screen.getByText('London, England, United Kingdom')).toBeInTheDocument();
    });

    // Press ArrowDown to select first, then ArrowUp to wrap to last
    await user.keyboard('{ArrowDown}{ArrowUp}');

    const thirdButton = screen.getByText('Tokyo, Japan').closest('button');
    expect(thirdButton).toHaveClass('bg-slate-100');
  });
});
