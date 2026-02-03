import { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import TimezoneClock from './TimezoneClock';
import type { Account } from '../types';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from './ThemeProvider';

// Fix Leaflet's default icon path issues in Vite/Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

export interface Classroom {
  id: string;
  name: string;
  location: string;
  lon: number;
  lat: number;
  interests: string[];
  availability: {
    [day: string]: number[]; // Array of hours (0-23)
  };
  size?: number;
  description?: string;
}

// Hardcoded classrooms removed. Now passed via props.
// The interface below is compatible with what is passed from parent
export interface Classroom {
  id: string;
  name: string;
  location: string;
  lon: number;
  lat: number;
  interests: string[];
  availability: {
    [day: string]: number[]; // Array of hours (0-23)
  };
  size?: number;
  description?: string;
}

interface MapViewProps {
  onClassroomSelect: (classroom: Classroom) => void;
  selectedClassroom?: Classroom;
  myClassroom: Account;
  classrooms?: Classroom[]; // New prop
  theme: string;
}

// Component to handle map view updates when selectedClassroom changes
function MapController({ center, zoom, animate = true }: { center: [number, number], zoom: number, animate?: boolean }) {
  const map = useMap();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isInitialized) {
      // On first load, set view immediately without animation
      map.setView(center, zoom);
      setIsInitialized(true);
    } else if (animate) {
      // On subsequent changes, animate only if requested
      map.flyTo(center, zoom, { duration: 1.2 });
    } else {
      // Set view immediately without animation
      map.setView(center, zoom);
    }
  }, [center, zoom, map, animate, isInitialized]);

  return null;
}

export default function MapView({ onClassroomSelect, selectedClassroom, myClassroom, classrooms = [] }: MapViewProps) {
  const { theme } = useTheme();
  const [mapInitialized, setMapInitialized] = useState(false);

  // Guard schedule (avoid runtime/TS errors if schedule is undefined)
  const schedule = (myClassroom as any).schedule ?? {};

  // Calculate relevancy for each classroom
  const calculateRelevancy = (classroom: Classroom) => {
    let scheduleMatches = false;
    for (const day in schedule) {
      const myHours = schedule[day] || [];
      const classroomHours = classroom.availability[day] || [];
      const hasOverlap = myHours.some((hour: number) => classroomHours.includes(hour));
      if (hasOverlap) {
        scheduleMatches = true;
        break;
      }
    }

    const matchingInterests = classroom.interests.filter(interest =>
      (myClassroom as any).interests?.includes(interest)
    );
    const interestMatchRatio = (myClassroom as any).interests?.length > 0
      ? matchingInterests.length / (myClassroom as any).interests.length
      : 0;

    // blue for perfect matches in schedule and interests
    if (scheduleMatches && interestMatchRatio === 1) {
      return '#4382f7';
    }
    // green for perfect interest match
    else if (interestMatchRatio === 1) {
      return '#10b981';
    }
    // yellow for good schedule/partial interest matches
    else if (interestMatchRatio >= 0.5) {
      return '#eab308';
    }
    // red for partial interest/no schedule matches
    else if (!scheduleMatches && interestMatchRatio > 0) {
      return '#ef4444';
    }
    // gray for no matches
    return '#64748b';
  };

  // make sure Account has x/y fields
  const myLon = myClassroom.x ?? -0.1273;
  const myLat = myClassroom.y ?? 51.2507;

  // compute a safe display name for the "You" marker
  const myDisplayName = (myClassroom as any).classroomName ?? (myClassroom as any).name ?? 'You';

  const createMarkerIcon = (color: string, isSelected: boolean) => {
    return L.divIcon({
      className: 'bg-transparent',
      html: `<div style="
        background-color: ${color};
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 4px rgba(0,0,0,0.4);
      "></div>`,
      iconSize: isSelected ? [24, 24] : [16, 16],
      iconAnchor: isSelected ? [12, 12] : [8, 8],
    });
  };

  const myIcon = L.divIcon({
    className: 'bg-transparent',
    html: `<div style="
       background-color: #a855f7;
       width: 100%;
       height: 100%;
       border-radius: 50%;
       border: 2px solid white;
       box-shadow: 0 0 8px #a855f7;
     "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  // Center map on selected classroom or user defaults
  const mapCenter: [number, number] = selectedClassroom
    ? [selectedClassroom.lat, selectedClassroom.lon]
    : [myLat, myLon];

  const mapZoom = selectedClassroom ? 13 : 2;

  return (
    <div className={`relative w-full h-full rounded-lg overflow-hidden border isolate ${theme === 'dark'
      ? 'bg-slate-900 border-slate-700'
      : 'bg-white border-slate-200'
      }`}>

      <MapContainer
        center={[myLat, myLon]}
        zoom={2}
        minZoom={2}
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
        zoomControl={false}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        scrollWheelZoom={true}
        className="z-0"
        whenReady={() => setMapInitialized(true)}
        fadeAnimation={false}
        zoomAnimation={false}
        markerZoomAnimation={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={theme === 'dark'
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
        />

        <MapController center={mapCenter} zoom={mapZoom} animate={!!selectedClassroom && mapInitialized} />


        {/* My Marker */}
        <Marker position={[myLat, myLon]} icon={myIcon}>
          <Popup>
            <strong>{myDisplayName}</strong> <br /> (You)
          </Popup>
        </Marker>

        {/* Classroom Markers */}
        {classrooms.map((classroom) => {
          const isSelected = selectedClassroom?.id === classroom.id;
          const nodeColor = calculateRelevancy(classroom);
          return (
            <Marker
              key={classroom.id}
              position={[classroom.lat, classroom.lon]}
              icon={createMarkerIcon(nodeColor, isSelected)}
              eventHandlers={{
                click: () => onClassroomSelect(classroom),
              }}
            >
              <Popup>
                <strong>{classroom.name}</strong><br />
                {classroom.location}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Overlays Container - forced high z-index */}
      <div className="absolute inset-0 pointer-events-none z-[1000]">

        {/* Classroom count badge */}
        <div className="absolute bottom-4 right-4 pointer-events-auto" style={{ pointerEvents: 'auto' }}>
          <Badge variant="secondary" className={`backdrop-blur-sm border shadow-lg ${theme === 'dark'
            ? 'bg-slate-900/80 text-slate-200 border-slate-700'
            : 'bg-white/90 text-slate-900 border-slate-200'
            }`}>
            {classrooms.length} Classrooms Available
          </Badge>
        </div>

        {/* Legend */}
        <div className={`absolute bottom-6 left-6 backdrop-blur-sm rounded-lg px-3 py-2 text-xs shadow-lg border pointer-events-auto ${theme === 'dark'
          ? 'bg-slate-800/95 border-slate-700'
          : 'bg-white/95 border-slate-300'
          }`} style={{ pointerEvents: 'auto' }}>
          Legend for matching interests
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue"></div>
              <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>Full, with matching schedule</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-green"></div>
              <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>Full</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-yellow"></div>
              <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>Partial</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red"></div>
              <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>Low</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-purple"></div>
              <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>You</span>
            </div>
          </div>
        </div>

        {/* Timezone Clock */}
        <div className="absolute top-4 right-4 pointer-events-auto" style={{ pointerEvents: 'auto' }}>
          <TimezoneClock />
        </div>
      </div>
    </div>
  );
}