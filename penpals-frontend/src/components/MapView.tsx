import { useState, useEffect, useMemo, useRef } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import TimezoneClock from './TimezoneClock';
import type { Account, Classroom } from '../types';
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



interface MapViewProps {
  onClassroomSelect: (classroom: Classroom) => void;
  selectedClassroom?: Classroom;
  myClassroom: Account;
  classrooms?: Classroom[]; // New prop
  theme: string;
}

// Component to handle map view updates when selectedClassroom changes
function MapController({ selectedClassroom, mapInitialized }: { selectedClassroom?: Classroom, mapInitialized: boolean }) {
  const map = useMap();
  const lastSelectedIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Only fly to classroom when a new classroom is selected (ID changes)
    if (selectedClassroom && mapInitialized && selectedClassroom.id !== lastSelectedIdRef.current) {
      lastSelectedIdRef.current = selectedClassroom.id;
      // Use fitBounds with a bounding box around the classroom for smooth animation
      const offset = 0.05; // degrees - creates a box around the classroom
      const classroomBounds = L.latLngBounds(
        L.latLng(selectedClassroom.lat - offset, selectedClassroom.lon - offset),
        L.latLng(selectedClassroom.lat + offset, selectedClassroom.lon + offset)
      );
      map.flyToBounds(classroomBounds, { duration: 1.5, padding: [100, 100] });
    } else if (!selectedClassroom && lastSelectedIdRef.current) {
      // Classroom was deselected, clear the last ID
      lastSelectedIdRef.current = undefined;
    }
  }, [selectedClassroom, map, mapInitialized]);

  return null;
}

// Debug component to verify map is ready
function MapDebug() {
  const map = useMap();

  useEffect(() => {
    console.log('Map is ready:', map, 'scrollWheelZoom enabled:', map.scrollWheelZoom ? 'yes' : 'no');
  }, [map]);

  return null;
}

function MapInstanceBridge({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();

  useEffect(() => {
    onReady(map);
  }, [map, onReady]);

  return null;
}

// Component to handle cluster zoom on click
function ClusterMarker({ position, icon, classrooms, currentZoom, count }: { position: [number, number], icon: any, classrooms: Classroom[], currentZoom: number, count: number }) {
  const map = useMap();

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={{
        click: () => {
          // Zoom into the cluster region
          map.flyTo(position, currentZoom + 2, { duration: 0.8 });
        },
      }}
    />
  );
}

// Component to handle smooth continuous scroll zoom like Google Maps
function SmoothScrollZoom({ minZoom }: { minZoom: number }) {
  const map = useMap();
  const zoomTimeoutRef = useRef<number | null>(null);
  const accumulatedDeltaRef = useRef<number>(0);
  const isEnabledRef = useRef(false);

  useEffect(() => {
    // Small delay to ensure map container is fully ready
    const enableTimer = window.setTimeout(() => {
      isEnabledRef.current = true;
    }, 100);

    const handleWheel = (e: WheelEvent) => {
      if (!isEnabledRef.current) return;

      e.preventDefault();

      // Normalize wheel delta across devices (trackpad/mouse)
      let delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 15; // line -> px approximation
      if (e.deltaMode === 2) delta *= 60; // page -> px approximation

      // Accumulate deltas
      accumulatedDeltaRef.current += delta;

      // Smooth, proportional zoom based on accumulated delta
      // Smaller accumulated values = smaller zoom changes
      const zoomDelta = -accumulatedDeltaRef.current * 0.0008;
      const currentZoom = map.getZoom();
      const targetZoom = Math.max(minZoom, Math.min(19, currentZoom + zoomDelta));

      // Zoom centered on map (no panning)
      map.setZoom(targetZoom, { animate: false });

      // Clear any pending zoom end event
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }

      // Fire moveend after zooming stops (with debounce)
      zoomTimeoutRef.current = window.setTimeout(() => {
        map.fire('moveend');
        accumulatedDeltaRef.current = 0; // Reset accumulator
      }, 200);
    };

    const container = map.getContainer();
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      clearTimeout(enableTimer);
      container.removeEventListener('wheel', handleWheel);
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
    };
  }, [map, minZoom]);

  return null;
}

// Component to track zoom level for clustering with debounce
function ZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMap();
  const debounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const handleZoom = () => {
      // Clear any pending debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce zoom changes to wait for animation to complete
      debounceTimerRef.current = window.setTimeout(() => {
        onZoomChange(Math.floor(map.getZoom()));
      }, 400); // Increased to 400ms to reduce updates during zoom
    };

    // Use moveend instead of zoomend to catch all movement including zoom
    map.on('moveend', handleZoom);
    onZoomChange(Math.floor(map.getZoom()));

    return () => {
      map.off('moveend', handleZoom);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [map, onZoomChange]);

  return null;
}

export default function MapView({ onClassroomSelect, selectedClassroom, myClassroom, classrooms = [] }: MapViewProps) {
  const { theme } = useTheme();
  const [mapInitialized, setMapInitialized] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(2);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [minZoom, setMinZoom] = useState(2);

  // Calculate minZoom based on window height to prevent grey borders
  useEffect(() => {
    const calculateMinZoom = () => {
      const windowHeight = window.innerHeight;
      // Adjust minZoom based on window height - taller windows need higher minZoom
      if (windowHeight > 1200) {
        setMinZoom(3);
      } else if (windowHeight > 900) {
        setMinZoom(2.5);
      } else {
        setMinZoom(2);
      }
    };

    calculateMinZoom();
    window.addEventListener('resize', calculateMinZoom);
    return () => window.removeEventListener('resize', calculateMinZoom);
  }, []);

  // Guard schedule (avoid runtime/TS errors if schedule is undefined)

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

  // Memoized clustering logic - only recalculates when currentZoom or classrooms change
  const clusteredMarkers = useMemo(() => {
    // No clustering at zoom 8 and above
    if (currentZoom >= 8) {
      return classrooms.map(c => ({
        isCluster: false,
        classroom: c,
        classrooms: [c],
        position: [c.lat, c.lon] as [number, number],
        id: c.id,
      }));
    }

    // Grid-based clustering for lower zoom levels
    const gridSize = currentZoom < 4 ? 20 : currentZoom < 6 ? 10 : 5; // degrees
    const clusters = new Map<string, typeof classrooms>();

    classrooms.forEach(classroom => {
      const gridLat = Math.floor(classroom.lat / gridSize) * gridSize;
      const gridLon = Math.floor(classroom.lon / gridSize) * gridSize;
      const key = `${gridLat},${gridLon}`;

      if (!clusters.has(key)) {
        clusters.set(key, []);
      }
      clusters.get(key)!.push(classroom);
    });

    const markers: any[] = [];
    clusters.forEach((clusterClassrooms, key) => {
      if (clusterClassrooms.length === 1) {
        const c = clusterClassrooms[0];
        markers.push({
          isCluster: false,
          classroom: c,
          classrooms: [c],
          position: [c.lat, c.lon] as [number, number],
          id: c.id,
        });
      } else {
        // Calculate average position for cluster
        const avgLat = clusterClassrooms.reduce((sum, c) => sum + c.lat, 0) / clusterClassrooms.length;
        const avgLon = clusterClassrooms.reduce((sum, c) => sum + c.lon, 0) / clusterClassrooms.length;
        markers.push({
          isCluster: true,
          classrooms: clusterClassrooms,
          position: [avgLat, avgLon] as [number, number],
          id: key,
          count: clusterClassrooms.length,
        });
      }
    });

    return markers;
  }, [currentZoom, classrooms, myClassroom]);

  // Helper to get best color for cluster - also memoized
  const getBestClusterColor = (clusterClassrooms: Classroom[]) => {
    let bestColor = '#64748b';
    let bestPriority = 0;

    clusterClassrooms.forEach(c => {
      const color = calculateRelevancy(c);
      // Extract priority from color if it's an object, or assign default
      const priority = color === '#4382f7' ? 5 : color === '#10b981' ? 4 : color === '#eab308' ? 3 : color === '#ef4444' ? 2 : 1;
      if (priority > bestPriority) {
        bestPriority = priority;
        bestColor = color;
      }
    });

    return bestColor;
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

  const createClusterIcon = (color: string, count: number) => {
    return L.divIcon({
      className: 'bg-transparent',
      html: `<div style="
        background-color: ${color};
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 0 6px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: white;
        font-size: 14px;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
      ">${count}</div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  };;

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

  return (
    <div className={`relative w-full h-full rounded-lg overflow-hidden border isolate ${theme === 'dark'
      ? 'bg-slate-900 border-slate-700'
      : 'bg-white border-slate-200'
      }`}>

      <MapContainer
        center={[myLat, myLon]}
        zoom={2}
        minZoom={minZoom}
        maxZoom={19}
        maxBounds={[[-85.051129, -180], [85.051129, 180]]}
        maxBoundsViscosity={1.0}
        zoomControl={false}
        style={{ height: '100%', width: '130%', zIndex: 0 }}
        scrollWheelZoom={true}
        className="z-0"
        whenReady={() => setMapInitialized(true)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={theme === 'dark'
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
          keepBuffer={8}
          maxZoom={19}
        />

        <MapController selectedClassroom={selectedClassroom} mapInitialized={mapInitialized} />
        <MapDebug />
        <MapInstanceBridge onReady={setMapInstance} />
        <ZoomTracker onZoomChange={setCurrentZoom} />
        {/* <SmoothScrollZoom minZoom={minZoom} /> */}

        {/* My Marker */}
        <Marker position={[myLat, myLon]} icon={myIcon}>
          <Popup>
            <strong>{myDisplayName}</strong> <br /> (You)
          </Popup>
        </Marker>

        {/* Classroom Markers with Clustering */}
        {clusteredMarkers.map((marker) => {
          if (marker.isCluster) {
            // Render cluster marker - clicking zooms in
            return (
              <ClusterMarker
                key={marker.id}
                position={marker.position}
                icon={createClusterIcon(getBestClusterColor(marker.classrooms), marker.count)}
                classrooms={marker.classrooms}
                currentZoom={currentZoom}
                count={marker.count}
              />
            );
          } else {
            // Render individual classroom marker - NO POPUP, details shown in sidebar
            const classroom = marker.classroom;
            const isSelected = selectedClassroom?.id === classroom.id;
            const nodeColor = calculateRelevancy(classroom);
            return (
              <Marker
                key={classroom.id}
                position={marker.position}
                icon={createMarkerIcon(nodeColor, isSelected)}
                eventHandlers={{
                  click: () => onClassroomSelect(classroom),
                }}
              />
            );
          }
        })}
      </MapContainer>

      {/* Overlays Container - forced high z-index */}
      <div className="absolute inset-0 pointer-events-none z-[1000]">

        {mapInstance && currentZoom >= 12 && (
          <div className="absolute bottom-4 right-4 pointer-events-auto" style={{ pointerEvents: 'auto' }}>
            <Button
              size="sm"
              variant="secondary"
              className={`shadow-lg ${theme === 'dark'
                ? 'bg-slate-900/80 text-slate-100 border border-slate-700 hover:bg-slate-800/90'
                : 'bg-white/90 text-slate-900 border border-slate-200 hover:bg-white'
                }`}
              onClick={() => {
                // Use fitBounds to smoothly fit the world bounds with padding
                const worldBounds = L.latLngBounds(
                  L.latLng(-85.051129, -180),
                  L.latLng(85.051129, 180)
                );
                mapInstance.flyToBounds(worldBounds, { duration: 1.5, padding: [50, 50] });
              }}
              aria-label="Zoom out completely"
            >
              Zoom out
            </Button>
          </div>
        )}

        {/* Legend */}
        <div className={`absolute bottom-6 left-6 backdrop-blur-sm rounded-lg px-3 py-2 text-xs shadow-lg border pointer-events-auto ${theme === 'dark'
          ? 'bg-slate-800/95 border-slate-700'
          : 'bg-white/95 border-slate-300'
          }`} style={{ pointerEvents: 'auto' }}>
          <div className="mb-2 font-semibold">{classrooms.length} Classrooms Available</div>
          <div className="mb-2">Legend for matching interests</div>
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