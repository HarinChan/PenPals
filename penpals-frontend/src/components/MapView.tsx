import { useState, useRef, useEffect, useCallback } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import TimezoneClock from './TimezoneClock';
import type { Account } from './SidePanel';

export interface Classroom {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
  interests: string[];
  availability: {
    [day: string]: number[];
  };
  size?: number;
  description?: string;
}

const classrooms: Classroom[] = [
  { 
    id: '1', 
    name: "Lee's Classroom", 
    location: 'New York, USA', 
    lat: 40.7128,
    lng: -74.0060,
    interests: ['Math', 'Biology', 'Rock Climbing'],
    availability: { Mon: [9,10,11,14,15], Tue: [9,10,11], Wed: [14,15,16], Thu: [9,10,11], Fri: [14,15] }
  },
  { 
    id: '2', 
    name: 'Math Nerd House', 
    location: 'Los Angeles, USA', 
    lat: 34.0522,
    lng: -118.2437,
    interests: ['Math', 'Physics', 'Chess'],
    availability: { Mon: [10,11,12,13], Tue: [10,11,12], Wed: [15,16,17], Thu: [10,11], Fri: [14,15,16] }
  },
  { 
    id: '3', 
    name: 'The Book Nook', 
    location: 'London, UK', 
    lat: 51.5074,
    lng: -0.1278,
    interests: ['English', 'History', 'Creative Writing'],
    availability: { Mon: [9,10,11], Tue: [14,15,16], Wed: [9,10,11], Thu: [14,15,16], Fri: [9,10] }
  },
  { 
    id: '4', 
    name: "Marie's Language Lab", 
    location: 'Paris, France', 
    lat: 48.8566,
    lng: 2.3522,
    interests: ['French', 'Spanish', 'Mandarin'],
    availability: { Mon: [8,9,10], Tue: [8,9,10,11], Wed: [14,15], Thu: [8,9,10], Fri: [14,15,16] }
  },
  { 
    id: '5', 
    name: 'Sakura Study Space', 
    location: 'Tokyo, Japan', 
    lat: 35.6762,
    lng: 139.6503,
    interests: ['Japanese', 'Anime', 'Calligraphy', 'Math'],
    availability: { Mon: [13,14,15], Tue: [13,14,15,16], Wed: [13,14], Thu: [14,15,16], Fri: [13,14,15] }
  },
  { 
    id: '6', 
    name: 'Outback Learning Hub', 
    location: 'Sydney, Australia', 
    lat: -33.8688,
    lng: 151.2093,
    interests: ['Biology', 'Geography', 'Surfing'],
    availability: { Mon: [7,8,9], Tue: [7,8,9,10], Wed: [16,17,18], Thu: [7,8,9], Fri: [16,17,18] }
  },
  { 
    id: '7', 
    name: 'TechHub Singapore', 
    location: 'Singapore', 
    lat: 1.3521,
    lng: 103.8198,
    interests: ['Computer Science', 'Robotics', 'Math'],
    availability: { Mon: [10,11,12,13], Tue: [10,11,12], Wed: [14,15,16], Thu: [10,11,12], Fri: [14,15] }
  },
  { 
    id: '8', 
    name: "Priya's Practice Room", 
    location: 'Mumbai, India', 
    lat: 19.0760,
    lng: 72.8777,
    interests: ['Hindi', 'Music', 'Dance', 'Math'],
    availability: { Mon: [15,16,17], Tue: [15,16,17], Wed: [9,10,11], Thu: [15,16,17], Fri: [9,10,11] }
  },
  { 
    id: '9', 
    name: 'Samba Study Circle', 
    location: 'São Paulo, Brazil', 
    lat: -23.5505,
    lng: -46.6333,
    interests: ['Portuguese', 'Music', 'Dance', 'Biology'],
    availability: { Mon: [11,12,13], Tue: [11,12,13,14], Wed: [16,17,18], Thu: [11,12,13], Fri: [16,17] }
  },
  { 
    id: '10', 
    name: 'Alpine Academic Circle', 
    location: 'Frankfurt, Germany', 
    lat: 50.1109,
    lng: 8.6821,
    interests: ['German', 'Chemistry', 'Physics', 'Hiking'],
    availability: { Mon: [8,9,10,11], Tue: [14,15,16], Wed: [8,9,10], Thu: [14,15,16], Fri: [8,9,10] }
  },
  { 
    id: '11', 
    name: 'The Knit & Wit', 
    location: 'Stockholm, Sweden', 
    lat: 59.3293,
    lng: 18.0686,
    interests: ['Knitting', 'Crafts', 'Design', 'Swedish'],
    availability: { Mon: [13,14,15], Tue: [9,10,11], Wed: [13,14,15], Thu: [9,10,11], Fri: [13,14,15] }
  },
  { 
    id: '12', 
    name: 'Seoul Study Station', 
    location: 'Seoul, South Korea', 
    lat: 37.5665,
    lng: 126.9780,
    interests: ['Korean', 'K-Pop', 'Art', 'Math'],
    availability: { Mon: [16,17,18], Tue: [10,11,12], Wed: [16,17,18], Thu: [10,11,12], Fri: [16,17] }
  },
];

interface MapViewProps {
  onClassroomSelect: (classroom: Classroom) => void;
  selectedClassroom?: Classroom;
  myClassroom: Account;
  theme?: 'light' | 'dark';
}

// Convert lat/lng to Mercator projection (x, y coordinates)
const latLngToMercator = (lat: number, lng: number) => {
  const x = (lng + 180) / 360;
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = 0.5 - mercN / (2 * Math.PI);
  return { x, y };
};

export default function MapView({ onClassroomSelect, selectedClassroom, myClassroom, theme = 'light' }: MapViewProps) {
  const [hoveredClassroom, setHoveredClassroom] = useState<string | null>(null);
  const [hoveredCluster, setHoveredCluster] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1.5);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const offsetStartRef = useRef({ x: 0, y: 0 });

  // Convert user's lat/lng to Mercator
  const myPosition = myClassroom.y && myClassroom.x
    ? latLngToMercator(myClassroom.y, myClassroom.x)
    : latLngToMercator(40, -100);

  // Calculate relevancy color
  const calculateRelevancy = useCallback((classroom: Classroom) => {
    let scheduleMatches = false;
    for (const day in myClassroom.schedule) {
      const myHours = myClassroom.schedule[day] || [];
      const classroomHours = classroom.availability[day] || [];
      const hasOverlap = myHours.some(hour => classroomHours.includes(hour));
      if (hasOverlap) {
        scheduleMatches = true;
        break;
      }
    }

    const matchingInterests = classroom.interests.filter(interest =>
      myClassroom.interests.includes(interest)
    );
    const interestMatchRatio = myClassroom.interests.length > 0
      ? matchingInterests.length / myClassroom.interests.length
      : 0;

    if (scheduleMatches && interestMatchRatio === 1) return '#10b981';
    if (scheduleMatches && interestMatchRatio > 0) return '#eab308';
    if (!scheduleMatches && interestMatchRatio > 0) return '#ef4444';
    return '#64748b';
  }, [myClassroom]);

  // Create clusters based on zoom level
  interface Cluster {
    id: number;
    classrooms: Classroom[];
    centerLat: number;
    centerLng: number;
    x: number;
    y: number;
  }

  const createClusters = useCallback((worldOffset: number, width: number, height: number): { clusters: Cluster[], individuals: Array<Classroom & { x: number, y: number }> } => {
    // At high zoom, show individual nodes
    if (zoom > 2.5) {
      const individuals = classrooms.map(classroom => {
        const pos = latLngToMercator(classroom.lat, classroom.lng);
        return {
          ...classroom,
          x: pos.x * width * zoom + offset.x + worldOffset,
          y: pos.y * height * zoom + offset.y
        };
      });
      return { clusters: [], individuals };
    }

    // Calculate clustering threshold based on zoom (larger at lower zoom)
    const clusterThreshold = 100 / zoom;
    
    const clusters: Cluster[] = [];
    const individuals: Array<Classroom & { x: number, y: number }> = [];
    const processed = new Set<string>();

    classrooms.forEach(classroom => {
      if (processed.has(classroom.id)) return;

      const pos = latLngToMercator(classroom.lat, classroom.lng);
      const x = pos.x * width * zoom + offset.x + worldOffset;
      const y = pos.y * height * zoom + offset.y;

      // Find nearby classrooms
      const nearby: Classroom[] = [classroom];
      let totalLat = classroom.lat;
      let totalLng = classroom.lng;

      classrooms.forEach(other => {
        if (other.id === classroom.id || processed.has(other.id)) return;
        
        const otherPos = latLngToMercator(other.lat, other.lng);
        const otherX = otherPos.x * width * zoom + offset.x + worldOffset;
        const otherY = otherPos.y * height * zoom + offset.y;
        
        const distance = Math.sqrt((x - otherX) ** 2 + (y - otherY) ** 2);
        
        if (distance < clusterThreshold) {
          nearby.push(other);
          totalLat += other.lat;
          totalLng += other.lng;
        }
      });

      // If we found nearby classrooms, create a cluster
      if (nearby.length > 1) {
        nearby.forEach(c => processed.add(c.id));
        const centerLat = totalLat / nearby.length;
        const centerLng = totalLng / nearby.length;
        const centerPos = latLngToMercator(centerLat, centerLng);
        
        clusters.push({
          id: clusters.length,
          classrooms: nearby,
          centerLat,
          centerLng,
          x: centerPos.x * width * zoom + offset.x + worldOffset,
          y: centerPos.y * height * zoom + offset.y
        });
      } else {
        processed.add(classroom.id);
        individuals.push({ ...classroom, x, y });
      }
    });

    return { clusters, individuals };
  }, [zoom, offset]);

  // Draw the map
  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear canvas with theme-aware background
    ctx.fillStyle = theme === 'dark' ? '#1e293b' : '#f1f5f9';
    ctx.fillRect(0, 0, width, height);

    // Draw grid with theme-aware colors
    ctx.strokeStyle = theme === 'dark' ? '#334155' : '#cbd5e1';
    ctx.lineWidth = 1;
    const gridSize = 50 * zoom;
    for (let x = (offset.x % gridSize); x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = (offset.y % gridSize); y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Calculate world wrapping
    const worldWidth = width * zoom;
    const visibleWorlds = Math.ceil(width / worldWidth) + 2;
    const startWorld = Math.floor(-offset.x / worldWidth) - 1;

    // Draw connection line if classroom is selected
    if (selectedClassroom) {
      const selectedPos = latLngToMercator(selectedClassroom.lat, selectedClassroom.lng);
      
      let closestDist = Infinity;
      let closestMyX = 0;
      let closestSelectedX = 0;
      
      for (let w = 0; w < visibleWorlds; w++) {
        const worldOffset = (startWorld + w) * worldWidth;
        const myX = myPosition.x * width * zoom + offset.x + worldOffset;
        const selectedX = selectedPos.x * width * zoom + offset.x + worldOffset;
        const dist = Math.abs(myX - selectedX);
        
        if (dist < closestDist) {
          closestDist = dist;
          closestMyX = myX;
          closestSelectedX = selectedX;
        }
      }
      
      const myY = myPosition.y * height * zoom + offset.y;
      const selectedY = selectedPos.y * height * zoom + offset.y;
      
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 12]);
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(closestMyX, myY);
      ctx.lineTo(closestSelectedX, selectedY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // Draw clusters and individuals (with world wrapping)
    // Track which nodes we've drawn labels for to avoid duplicates
    const drawnLabels = new Set<string>();
    
    for (let w = 0; w < visibleWorlds; w++) {
      const worldOffset = (startWorld + w) * worldWidth;

      const { clusters, individuals } = createClusters(worldOffset, width, height);

      // Draw clusters
      clusters.forEach((cluster) => {
        const x = cluster.x;
        const y = cluster.y;

        if (x < -100 || x > width + 100 || y < -100 || y > height + 100) return;

        const isHovered = hoveredCluster === cluster.id;
        const count = cluster.classrooms.length;
        
        // Calculate cluster size based on count
        const baseRadius = 18;
        const radius = baseRadius + Math.log(count) * 4;

        // Calculate best relevancy color in cluster (priority: green > yellow > red > grey)
        let bestColor = '#64748b'; // grey default
        const colorPriority = { '#10b981': 4, '#eab308': 3, '#ef4444': 2, '#64748b': 1 };
        let bestPriority = 0;
        
        cluster.classrooms.forEach((classroom) => {
          const color = calculateRelevancy(classroom);
          const priority = colorPriority[color] || 0;
          if (priority > bestPriority) {
            bestPriority = priority;
            bestColor = color;
          }
        });

        // Create lighter and darker variants for gradient
        const colorMap: { [key: string]: { light: string, dark: string } } = {
          '#10b981': { light: '#34d399', dark: '#059669' },  // green
          '#eab308': { light: '#fbbf24', dark: '#ca8a04' },  // yellow
          '#ef4444': { light: '#f87171', dark: '#dc2626' },  // red
          '#64748b': { light: '#94a3b8', dark: '#475569' }   // grey
        };
        const gradientColors = colorMap[bestColor] || { light: bestColor, dark: bestColor };

        // Draw outer glow for hover
        if (isHovered) {
          ctx.fillStyle = bestColor;
          ctx.globalAlpha = 0.15;
          ctx.beginPath();
          ctx.arc(x, y, radius + 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // Draw cluster circle with gradient effect
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, gradientColors.light);
        gradient.addColorStop(1, gradientColors.dark);
        
        ctx.fillStyle = gradient;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Draw count
        ctx.save(); // Save context state
        ctx.fillStyle = '#ffffff';
        ctx.font = `600 ${radius > 22 ? '16' : '14'}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(count.toString(), x, y);
        ctx.restore(); // Restore context state

        // Draw label on hover - only once for the most centered copy
        const clusterKey = `cluster-${cluster.id}`;
        const shouldDrawLabel = isHovered && !drawnLabels.has(clusterKey) && x > 0 && x < width;
        if (shouldDrawLabel) {
          drawnLabels.add(clusterKey);
          
          const label = `${count} classrooms`;
          ctx.save(); // Save context state
          ctx.font = '600 13px sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          const textMetrics = ctx.measureText(label);
          const padding = 10;
          const labelWidth = textMetrics.width + padding * 2;
          const labelHeight = 28;
          
          let labelX = x + radius + 10;
          if (labelX + labelWidth > width - 10) {
            labelX = x - radius - labelWidth - 10;
          }
          
          let labelY = y - labelHeight / 2;
          if (labelY < 10) labelY = 10;
          if (labelY + labelHeight > height - 10) labelY = height - labelHeight - 10;

          ctx.fillStyle = theme === 'dark' ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)';
          ctx.strokeStyle = theme === 'dark' ? '#475569' : '#cbd5e1';
          ctx.lineWidth = 1;
          ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
          ctx.shadowBlur = 8;
          ctx.shadowOffsetY = 2;
          ctx.beginPath();
          ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 6);
          ctx.fill();
          ctx.stroke();
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;

          ctx.fillStyle = theme === 'dark' ? '#f1f5f9' : '#1e293b';
          ctx.fillText(label, labelX + padding, labelY + labelHeight / 2);
          ctx.restore(); // Restore context state
        }
      });

      // Draw individuals
      individuals.forEach((classroom) => {
        const x = classroom.x;
        const y = classroom.y;

        if (x < -100 || x > width + 100 || y < -100 || y > height + 100) return;

        const isSelected = selectedClassroom?.id === classroom.id;
        const isHovered = hoveredClassroom === classroom.id;
        const color = calculateRelevancy(classroom);
        const radius = isSelected ? 10 : isHovered ? 8 : 7;

        // Draw selection ring
        if (isSelected) {
          ctx.fillStyle = '#3b82f6';
          ctx.globalAlpha = 0.2;
          ctx.beginPath();
          ctx.arc(x, y, radius + 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Draw marker
        ctx.fillStyle = color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw label on hover or selection - only once for the most centered copy
        const classroomKey = `classroom-${classroom.id}`;
        const shouldDrawLabel = (isHovered || isSelected) && !drawnLabels.has(classroomKey) && x > 0 && x < width;
        if (shouldDrawLabel) {
          drawnLabels.add(classroomKey);
          
          ctx.save(); // Save context state
          ctx.font = '600 13px sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          const textMetrics = ctx.measureText(classroom.name);
          const padding = 10;
          const labelWidth = textMetrics.width + padding * 2;
          const labelHeight = 28;
          
          // Position label to the right, but flip to left if too close to edge
          let labelX = x + 15;
          if (labelX + labelWidth > width - 10) {
            labelX = x - labelWidth - 15;
          }
          
          // Adjust vertical position if too close to top or bottom
          let labelY = y - labelHeight / 2;
          if (labelY < 10) labelY = 10;
          if (labelY + labelHeight > height - 10) labelY = height - labelHeight - 10;

          // Draw label background with theme awareness
          ctx.fillStyle = theme === 'dark' ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)';
          ctx.strokeStyle = theme === 'dark' ? '#475569' : '#cbd5e1';
          ctx.lineWidth = 1;

          ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
          ctx.shadowBlur = 8;
          ctx.shadowOffsetY = 2;
          ctx.beginPath();
          ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 6);
          ctx.fill();
          ctx.stroke();
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;

          ctx.fillStyle = theme === 'dark' ? '#f1f5f9' : '#1e293b';
          ctx.fillText(classroom.name, labelX + padding, labelY + labelHeight / 2);
          ctx.restore(); // Restore context state
        }
      });

      // Draw user's classroom (with world wrapping)
      const myX = myPosition.x * width * zoom + offset.x + worldOffset;
      const myY = myPosition.y * height * zoom + offset.y;

      if (myX >= -100 && myX <= width + 100 && myY >= -100 && myY <= height + 100) {
        // Pulse effect
        ctx.fillStyle = '#a855f7';
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.arc(myX, myY, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Main marker
        ctx.fillStyle = '#a855f7';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(myX, myY, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner dot
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(myX, myY, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Draw label only once for the most centered copy
        const userKey = 'user-classroom';
        const shouldDrawLabel = !drawnLabels.has(userKey) && myX > 0 && myX < width;
        if (shouldDrawLabel) {
          drawnLabels.add(userKey);
          
          const label = `${myClassroom.classroomName} (You)`;
          ctx.save(); // Save context state
          ctx.font = '600 13px sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          const textMetrics = ctx.measureText(label);
          const padding = 10;
          const labelWidth = textMetrics.width + padding * 2;
          const labelHeight = 28;
          
          let labelX = myX + 15;
          if (labelX + labelWidth > width - 10) {
            labelX = myX - labelWidth - 15;
          }
          
          let labelY = myY - labelHeight / 2;
          if (labelY < 10) labelY = 10;
          if (labelY + labelHeight > height - 10) labelY = height - labelHeight - 10;

          ctx.fillStyle = theme === 'dark' ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)';
          ctx.strokeStyle = theme === 'dark' ? '#475569' : '#cbd5e1';
          ctx.lineWidth = 1;
          
          ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
          ctx.shadowBlur = 8;
          ctx.shadowOffsetY = 2;
          ctx.beginPath();
          ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 6);
          ctx.fill();
          ctx.stroke();
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;

          ctx.fillStyle = '#a855f7';
          ctx.fillText(label, labelX + padding, labelY + labelHeight / 2);
          ctx.restore(); // Restore context state
        }
      }
    }
  }, [zoom, offset, selectedClassroom, hoveredClassroom, hoveredCluster, myClassroom, myPosition, calculateRelevancy, createClusters, theme]);

  // Handle mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    offsetStartRef.current = { ...offset };
  }, [offset]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) {
      // Check hover
      if (!canvasRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const worldWidth = rect.width * zoom;
      const visibleWorlds = Math.ceil(rect.width / worldWidth) + 2;
      const startWorld = Math.floor(-offset.x / worldWidth) - 1;
      
      let foundHover: string | null = null;
      let foundClusterHover: number | null = null;
      
      for (let w = 0; w < visibleWorlds && !foundHover && !foundClusterHover; w++) {
        const worldOffset = (startWorld + w) * worldWidth;
        
        const { clusters, individuals } = createClusters(worldOffset, rect.width, rect.height);
        
        // Check clusters first (they're larger)
        for (const cluster of clusters) {
          const baseRadius = 18;
          const radius = baseRadius + Math.log(cluster.classrooms.length) * 4;
          const dist = Math.sqrt((mouseX - cluster.x) ** 2 + (mouseY - cluster.y) ** 2);
          
          if (dist < radius + 5) {
            foundClusterHover = cluster.id;
            break;
          }
        }
        
        // Then check individual classrooms
        if (!foundClusterHover) {
          for (const classroom of individuals) {
            const dist = Math.sqrt((mouseX - classroom.x) ** 2 + (mouseY - classroom.y) ** 2);
            
            if (dist < 12) {
              foundHover = classroom.id;
              break;
            }
          }
        }
      }
      
      setHoveredClassroom(foundHover);
      setHoveredCluster(foundClusterHover);
      return;
    }

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    
    setOffset({
      x: offsetStartRef.current.x + dx,
      y: offsetStartRef.current.y + dy
    });
  }, [zoom, offset, createClusters]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const worldWidth = rect.width * zoom;
    const visibleWorlds = Math.ceil(rect.width / worldWidth) + 2;
    const startWorld = Math.floor(-offset.x / worldWidth) - 1;
    
    for (let w = 0; w < visibleWorlds; w++) {
      const worldOffset = (startWorld + w) * worldWidth;
      
      for (const classroom of classrooms) {
        const pos = latLngToMercator(classroom.lat, classroom.lng);
        const x = pos.x * rect.width * zoom + offset.x + worldOffset;
        const y = pos.y * rect.height * zoom + offset.y;
        const dist = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);
        
        if (dist < 12) {
          onClassroomSelect(classroom);
          return;
        }
      }
    }
  }, [zoom, offset, onClassroomSelect]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    
    // Calculate minimum zoom to prevent seeing the same node twice
    // World width = containerWidth * zoom, so zoom must be >= 1 to avoid wrapping in viewport
    const minZoom = 1.0;
    const maxZoom = 4.0;
    
    const newZoom = Math.min(Math.max(zoom * delta, minZoom), maxZoom);
    
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const scaleChange = newZoom / zoom;
    const newOffsetX = mouseX - (mouseX - offset.x) * scaleChange;
    const newOffsetY = mouseY - (mouseY - offset.y) * scaleChange;
    
    setZoom(newZoom);
    setOffset({ x: newOffsetX, y: newOffsetY });
  }, [zoom, offset]);

  // Setup event listeners
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Redraw on changes
  useEffect(() => {
    drawMap();
  }, [drawMap]);

  const handleZoomIn = () => setZoom(Math.min(zoom + 0.3, 4));
  const handleZoomOut = () => setZoom(Math.max(zoom - 0.3, 1.0));
  const handleReset = () => {
    setZoom(1.5);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 dark:from-slate-800 dark:via-slate-900 dark:to-slate-950 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700"
      style={{ cursor: isDraggingRef.current ? 'grabbing' : 'grab' }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onWheel={handleWheel}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Zoom controls */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-10">
        <Button
          size="icon"
          variant="secondary"
          className="bg-white/90 hover:bg-white dark:bg-slate-900/90 dark:hover:bg-slate-900 backdrop-blur-sm border-slate-300 dark:border-slate-700 shadow-lg"
          onClick={handleZoomIn}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="bg-white/90 hover:bg-white dark:bg-slate-900/90 dark:hover:bg-slate-900 backdrop-blur-sm border-slate-300 dark:border-slate-700 shadow-lg"
          onClick={handleZoomOut}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="bg-white/90 hover:bg-white dark:bg-slate-900/90 dark:hover:bg-slate-900 backdrop-blur-sm border-slate-300 dark:border-slate-700 shadow-lg"
          onClick={handleReset}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        <div className="text-center text-xs bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded px-2 py-1 border border-slate-300 dark:border-slate-700">
          {Math.round(zoom * 67)}%
        </div>
      </div>

      {/* Classroom count badge */}
      <div className="absolute top-4 left-4 pointer-events-none z-10">
        <Badge variant="secondary" className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-slate-300 dark:border-slate-700 shadow-md">
          {classrooms.length} Classrooms
        </Badge>
      </div>

      {/* Compact Legend - Repositioned to bottom left, away from timezone clock */}
      <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></div>
            <span className="text-slate-700 dark:text-slate-300">Perfect</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#eab308]"></div>
            <span className="text-slate-700 dark:text-slate-300">Good</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></div>
            <span className="text-slate-700 dark:text-slate-300">Partial</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#a855f7]"></div>
            <span className="text-slate-700 dark:text-slate-300">You</span>
          </div>
        </div>
      </div>

      {/* Timezone Clock */}
      <TimezoneClock />
    </div>
  );
}

export { classrooms };