import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Account, Classroom } from '../../types';

const testState = vi.hoisted(() => {
  type Listener = () => void;

  const createMockMap = () => {
    const listeners: Record<string, Listener[]> = {};
    const container = document.createElement('div');

    return {
      flyToBounds: vi.fn(),
      flyTo: vi.fn(),
      setZoom: vi.fn((nextZoom: number) => {
        state.currentZoomLevel = nextZoom;
      }),
      getZoom: vi.fn(() => state.currentZoomLevel),
      fire: vi.fn((eventName: string) => {
        (listeners[eventName] || []).forEach((cb) => cb());
      }),
      on: vi.fn((eventName: string, cb: Listener) => {
        listeners[eventName] = listeners[eventName] || [];
        listeners[eventName].push(cb);
      }),
      off: vi.fn((eventName: string, cb: Listener) => {
        listeners[eventName] = (listeners[eventName] || []).filter((fn) => fn !== cb);
      }),
      getContainer: vi.fn(() => container),
      scrollWheelZoom: true,
    };
  };

  const state: {
    currentTheme: 'light' | 'dark';
    currentZoomLevel: number;
    mockMap: ReturnType<typeof createMockMap>;
    mockLeaflet: any;
    createMockMap: typeof createMockMap;
  } = {
    currentTheme: 'light',
    currentZoomLevel: 2,
    mockMap: {} as any,
    mockLeaflet: null,
    createMockMap,
  };

  state.mockMap = createMockMap();
  state.mockLeaflet = {
    Icon: {
      Default: {
        prototype: {},
        mergeOptions: vi.fn(),
      },
    },
    divIcon: vi.fn((options: any) => ({ options })),
    latLng: vi.fn((lat: number, lon: number) => ({ lat, lon })),
    latLngBounds: vi.fn((a: any, b: any) => ({ a, b })),
  };

  return state;
});

vi.mock('../ThemeProvider', () => ({
  useTheme: () => ({ theme: testState.currentTheme, toggleTheme: vi.fn() }),
}));

vi.mock('../TimezoneClock', () => ({
  default: ({ lat, lon }: { lat: number; lon: number }) => (
    <div data-testid="timezone-clock">{`${lat},${lon}`}</div>
  ),
}));

vi.mock('leaflet', () => ({
  __esModule: true,
  default: testState.mockLeaflet,
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, whenReady, minZoom }: any) => {
    React.useEffect(() => {
      whenReady?.();
    }, [whenReady]);

    return (
      <div data-testid="map-container" data-min-zoom={String(minZoom)}>
        {children}
      </div>
    );
  },
  TileLayer: ({ url }: any) => <div data-testid="tile-layer" data-url={url} />,
  Marker: ({ children, eventHandlers, icon }: any) => {
    const iconSize = icon?.options?.iconSize?.[0];
    const label = iconSize === 40 ? 'cluster-marker' : 'marker';

    return (
      <div data-testid={label}>
        {eventHandlers?.click && (
          <button type="button" aria-label={`${label}-click`} onClick={() => eventHandlers.click()}>
            {label}
          </button>
        )}
        {children}
      </div>
    );
  },
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
  useMap: () => testState.mockMap,
}));

import MapView from '../MapView';

const makeMyClassroom = (overrides: Partial<Account> = {}): Account => ({
  id: 'my-1',
  classroomName: 'My Classroom',
  location: 'London',
  size: 30,
  description: 'My class',
  interests: ['math', 'science'],
  schedule: { Mon: [9, 10], Tue: [14] },
  x: -0.1273,
  y: 51.2507,
  ...overrides,
});

const makeClassroom = (overrides: Partial<Classroom> = {}): Classroom => ({
  id: 'c-1',
  name: 'Class A',
  location: 'Paris',
  lat: 48.8566,
  lon: 2.3522,
  interests: ['math'],
  availability: { Mon: [9] },
  size: 25,
  description: 'A classroom',
  ...overrides,
});

const renderMapView = (overrides: Partial<React.ComponentProps<typeof MapView>> = {}) => {
  const onClassroomSelect = vi.fn();
  const myClassroom = makeMyClassroom();

  render(
    <MapView
      onClassroomSelect={onClassroomSelect}
      myClassroom={myClassroom}
      classrooms={[makeClassroom()]}
      theme={testState.currentTheme}
      {...overrides}
    />,
  );

  return { onClassroomSelect, myClassroom };
};

describe('MapView', () => {
  beforeEach(() => {
    testState.currentTheme = 'light';
    testState.currentZoomLevel = 2;
    testState.mockMap = testState.createMockMap();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders legend and timezone clock from my classroom location', () => {
    renderMapView({ classrooms: [makeClassroom(), makeClassroom({ id: 'c-2', lat: 40, lon: -73 })] });

    expect(screen.getByText('2 Classrooms Available')).toBeInTheDocument();
    expect(screen.getByText('Legend for matching interests')).toBeInTheDocument();
    expect(screen.getByTestId('timezone-clock')).toHaveTextContent('51.2507,-0.1273');
  });

  it('calls onClassroomSelect when clicking an individual classroom marker', async () => {
    const user = userEvent.setup();
    testState.currentZoomLevel = 8;
    const classroom = makeClassroom({ id: 'c-click', name: 'Clickable Room', lat: 35, lon: 139 });
    const { onClassroomSelect } = renderMapView({ classrooms: [classroom] });

    await user.click(screen.getByRole('button', { name: 'marker-click' }));

    expect(onClassroomSelect).toHaveBeenCalledWith(classroom);
  });

  it('renders overlap popup and selects classroom from overlap list', async () => {
    const user = userEvent.setup();
    testState.currentZoomLevel = 8;

    const overlappingA = makeClassroom({ id: 'c-a', name: 'Overlap A', lat: 10, lon: 10 });
    const overlappingB = makeClassroom({ id: 'c-b', name: 'Overlap B', lat: 10, lon: 10 });

    const { onClassroomSelect } = renderMapView({ classrooms: [overlappingA, overlappingB] });

    expect(screen.getByText('2 Classrooms Here')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /overlap b/i }));

    await waitFor(() => {
      expect(onClassroomSelect).toHaveBeenCalledWith(overlappingB);
    });
  });

  it('handles cluster marker click by zooming in', async () => {
    const user = userEvent.setup();
    testState.currentZoomLevel = 2;

    const clustered = [
      makeClassroom({ id: 'c-1', lat: 42, lon: 5 }),
      makeClassroom({ id: 'c-2', lat: 43, lon: 6 }),
    ];

    renderMapView({ classrooms: clustered });

    await user.click(screen.getByRole('button', { name: 'cluster-marker-click' }));

    expect(testState.mockMap.flyTo).toHaveBeenCalledTimes(1);
  });

  it('flies to selected classroom bounds when selectedClassroom changes', async () => {
    testState.currentZoomLevel = 3;
    const selectedClassroom = makeClassroom({ id: 'selected-1', lat: 22, lon: 114 });

    renderMapView({ selectedClassroom, classrooms: [selectedClassroom] });

    await waitFor(() => {
      expect(testState.mockMap.flyToBounds).toHaveBeenCalled();
    });
  });

  it('shows zoom out control at high zoom and resets bounds on click', async () => {
    const user = userEvent.setup();
    testState.currentZoomLevel = 12;

    renderMapView({ classrooms: [makeClassroom()] });

    const zoomOutButton = screen.getByRole('button', { name: 'Zoom out completely' });
    await user.click(zoomOutButton);

    expect(testState.mockMap.flyToBounds).toHaveBeenCalled();
  });

  it('uses dark theme tile layer when theme is dark', () => {
    testState.currentTheme = 'dark';
    renderMapView({ classrooms: [makeClassroom()] });

    expect(screen.getByTestId('tile-layer').getAttribute('data-url')).toContain('dark_all');
  });

  it('updates minZoom based on window height resize', () => {
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 1300,
    });

    renderMapView({ classrooms: [makeClassroom()] });

    window.dispatchEvent(new Event('resize'));

    expect(screen.getByTestId('map-container')).toHaveAttribute('data-min-zoom', '3');
  });
});
