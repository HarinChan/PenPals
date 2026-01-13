import { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import TimezoneClock from './TimezoneClock';
import type { Account } from './SidePanel';
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

const classrooms: Classroom[] = [
  { id: '1', name: "Lee's Classroom", location: 'New York, USA', lon: -74.0060, lat: 40.7128, interests: ['Math', 'Biology', 'Rock Climbing'], availability: { Mon: [9, 10, 11, 14, 15], Tue: [9, 10, 11], Wed: [14, 15, 16], Thu: [9, 10, 11], Fri: [14, 15] } },
  { id: '2', name: 'Math Lover House', location: 'Los Angeles, USA', lon: -118.2437, lat: 34.0522, interests: ['Math', 'Physics', 'Chess'], availability: { Mon: [10, 11, 12, 13], Tue: [10, 11, 12], Wed: [15, 16, 17], Thu: [10, 11], Fri: [14, 15, 16] } },
  { id: '3', name: 'The Book Nook', location: 'Bangkok, Thailand', lon: 100.518, lat: 13.7563, interests: ['English', 'History', 'Creative Writing'], availability: { Mon: [9, 10, 11], Tue: [14, 15, 16], Wed: [9, 10, 11], Thu: [14, 15, 16], Fri: [9, 10] } },
  { id: '4', name: "Marie's Language Lab", location: 'Paris, France', lon: 2.3522, lat: 48.8566, interests: ['French', 'Spanish', 'Mandarin'], availability: { Mon: [8, 9, 10], Tue: [8, 9, 10, 11], Wed: [14, 15], Thu: [8, 9, 10], Fri: [14, 15, 16] } },
  { id: '5', name: 'Sakura Study Space', location: 'Tokyo, Japan', lon: 139.6917, lat: 35.6895, interests: ['Japanese', 'Anime', 'Calligraphy', 'Math'], availability: { Mon: [13, 14, 15], Tue: [13, 14, 15, 16], Wed: [13, 14], Thu: [14, 15, 16], Fri: [13, 14, 15] } },
  { id: '6', name: 'Outback Learning Hub', location: 'Sydney, Australia', lon: 151.2093, lat: -33.8688, interests: ['Biology', 'Geography', 'Surfing'], availability: { Mon: [7, 8, 9], Tue: [7, 8, 9, 10], Wed: [16, 17, 18], Thu: [7, 8, 9], Fri: [16, 17, 18] } },
  { id: '7', name: 'TechHub Singapore', location: 'Singapore', lon: 103.8198, lat: 1.3521, interests: ['Computer Science', 'Robotics', 'Math'], availability: { Mon: [10, 11, 12, 13], Tue: [10, 11, 12], Wed: [14, 15, 16], Thu: [10, 11, 12], Fri: [14, 15] } },
  { id: '8', name: "Priya's Practice Room", location: 'Mumbai, India', lon: 72.8777, lat: 19.0760, interests: ['Hindi', 'Music', 'Dance', 'Math'], availability: { Mon: [15, 16, 17], Tue: [15, 16, 17], Wed: [9, 10, 11], Thu: [15, 16, 17], Fri: [9, 10, 11] } },
  { id: '9', name: 'Samba Study Circle', location: 'São Paulo, Brazil', lon: -46.6333, lat: -23.5505, interests: ['Portuguese', 'Music', 'Dance', 'Biology'], availability: { Mon: [11, 12, 13], Tue: [11, 12, 13, 14], Wed: [16, 17, 18], Thu: [11, 12, 13], Fri: [16, 17] } },
  { id: '10', name: 'Alpine Academic Circle', location: 'Frankfurt, Germany', lon: 8.6821, lat: 50.1109, interests: ['German', 'Chemistry', 'Physics', 'Hiking'], availability: { Mon: [8, 9, 10, 11], Tue: [14, 15, 16], Wed: [8, 9, 10], Thu: [14, 15, 16], Fri: [8, 9, 10] } },
  { id: '11', name: 'The Knit & Wit', location: 'Stockholm, Sweden', lon: 18.0686, lat: 59.3293, interests: ['Knitting', 'Crafts', 'Design', 'Swedish'], availability: { Mon: [13, 14, 15], Tue: [9, 10, 11], Wed: [13, 14, 15], Thu: [9, 10, 11], Fri: [13, 14, 15] } },
  { id: '12', name: 'Seoul Study Station', location: 'Seoul, South Korea', lon: 126.9780, lat: 37.5665, interests: ['Korean', 'K-Pop', 'Art', 'Math'], availability: { Mon: [16, 17, 18], Tue: [10, 11, 12], Wed: [16, 17, 18], Thu: [10, 11, 12], Fri: [16, 17] } },
];

interface MapViewProps {
  onClassroomSelect: (classroom: Classroom) => void;
  selectedClassroom?: Classroom;
  myClassroom: Account;
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

export default function MapView({ onClassroomSelect, selectedClassroom, myClassroom }: MapViewProps) {
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

  // make sure Account has lon/lat fields
  const myLon = myClassroom.lon ?? -0.1273;
  const myLat = myClassroom.lat ?? 51.2507;

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
        <div className="absolute bottom-4 right-4 pointer-events-auto">
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
          }`}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></div>
              <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>Perfect</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#eab308]"></div>
              <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>Good</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></div>
              <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>Partial</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#a855f7]"></div>
              <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>You</span>
            </div>
          </div>
        </div>

        {/* Timezone Clock */}
        <div className="absolute top-4 right-4 pointer-events-auto">
          <TimezoneClock />
        </div>
      </div>
    </div>
  );
}

export { classrooms };