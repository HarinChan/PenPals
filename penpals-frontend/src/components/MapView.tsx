import { useState } from 'react';
import { Badge } from './ui/badge';
import TimezoneClock from './TimezoneClock';
import type { Account } from './SidePanel';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { geoMercator } from 'd3-geo';
import { useTheme } from './ThemeProvider';

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

export default function MapView({ onClassroomSelect, selectedClassroom, myClassroom }: MapViewProps) {
  const [hoveredClassroom, setHoveredClassroom] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const { theme } = useTheme();

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

    // green for perfect matches
    if (scheduleMatches && interestMatchRatio === 1) {
      return '#10b981';
    }
    // yellow for good schedule/partial interest matches
    else if (scheduleMatches && interestMatchRatio > 0) {
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

  // Projection settings used both for map rendering and drawing an SVG connection line.
  const MAP_WIDTH = 800;
  const MAP_HEIGHT = 450;
  const PROJ_SCALE = 160;
  const projection = geoMercator()
    .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2])
    .scale(PROJ_SCALE);

  return (
    <div className={`relative w-full h-full rounded-lg overflow-hidden border ${theme === 'dark'
      ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700'
      : 'bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 border-slate-200'
      }`}>
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke={theme === 'dark' ? '#475569' : '#94a3b8'} strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-50">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.5, 8))}
          className={`px-2 py-1 rounded border transition-colors ${theme === 'dark'
            ? 'bg-slate-800 border-slate-600 hover:bg-slate-700 text-slate-100'
            : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-900'
            } shadow`}
        >
          +
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.5, 1))}
          className={`px-2 py-1 rounded border transition-colors ${theme === 'dark'
            ? 'bg-slate-800 border-slate-600 hover:bg-slate-700 text-slate-100'
            : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-900'
            } shadow`}
        >
          –
        </button>
      </div>

      {/* World map with classroom markers using react-simple-maps */}
      <div className="absolute inset-0">
        <ComposableMap
          projectionConfig={{ scale: PROJ_SCALE }}
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          className="w-full h-full"
        >

          <ZoomableGroup
            zoom={zoom}
            onMoveEnd={({ zoom: newZoom }) => setZoom(newZoom)}
          >
            <Geographies geography="https://unpkg.com/world-atlas@2/countries-110m.json">
              {({ geographies }) => (
                <>
                  {geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={theme === 'dark' ? '#1e293b' : '#e6eef8'}
                      stroke={theme === 'dark' ? '#475569' : '#cbd5e1'}
                      strokeWidth={0.5 / zoom}
                    />
                  ))}
                </>
              )}
            </Geographies>



            {/* My classroom marker */}
            {(() => {
              return (
                <Marker key={myClassroom.id || 'me'} coordinates={[myLon, myLat]}>
                  <g>
                    <circle r={8 / zoom} fill="#a855f7" opacity={0.18} className="animate-ping" />
                    <circle r={4 / zoom} fill="#a855f7" style={{ filter: 'drop-shadow(0 0 6px #a855f7)' }} />
                    <text x={10 / zoom} y={4 / zoom} fontSize={10 / zoom} fill="#a855f7" className="pointer-events-none">
                      {myDisplayName} (You)
                    </text>
                  </g>
                </Marker>
              );
            })()}

            {/* Other classroom markers */}
            {classrooms.map((classroom) => {
              const isSelected = selectedClassroom?.id === classroom.id;
              const isHovered = hoveredClassroom === classroom.id;
              const nodeColor = calculateRelevancy(classroom);
              const baseRadius = isSelected ? 4.5 : isHovered ? 3.5 : 2.8;
              return (
                <Marker key={classroom.id} coordinates={[classroom.lon, classroom.lat]}>
                  <g
                    onMouseEnter={() => setHoveredClassroom(classroom.id)}
                    onMouseLeave={() => setHoveredClassroom(null)}
                    onClick={() => onClassroomSelect(classroom)}
                    className="cursor-pointer"
                  >
                    {isSelected && <circle r={8 / zoom} fill="#3b82f6" opacity={0.18} className="animate-ping" />}
                    <circle r={baseRadius / zoom} fill={isSelected ? '#3b82f6' : nodeColor} style={{ filter: isSelected || isHovered ? 'drop-shadow(0 0 6px currentColor)' : 'none' }} />
                    {(isHovered || isSelected) && (
                      <text x={8 / zoom} y={4 / zoom} fontSize={10 / zoom} fill="white" className="pointer-events-none" style={{ background: '#0f172a' }}>
                        {classroom.name}
                      </text>
                    )}
                  </g>
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* Classroom count badge */}
      <div className="absolute top-6 left-6">
        <Badge variant="secondary" className={`backdrop-blur-sm border ${theme === 'dark'
          ? 'bg-slate-900/80 text-slate-200 border-slate-700'
          : 'bg-slate-900/80 text-slate-200 border-slate-700'
          }`}>
          {classrooms.length} Classrooms Available
        </Badge>
      </div>

      {/* Compact Legend*/}
      <div className={`absolute bottom-4 left-4 backdrop-blur-sm rounded-lg px-3 py-2 text-xs z-10 shadow-lg border ${theme === 'dark'
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
      <TimezoneClock />
    </div>
  );
}

export { classrooms };