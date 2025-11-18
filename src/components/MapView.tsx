import { useState } from 'react';
import { Badge } from './ui/badge';
import TimezoneClock from './TimezoneClock';
import type { Account } from './SidePanel';

export interface Classroom {
  id: string;
  name: string;
  location: string;
  x: number;
  y: number;
  interests: string[];
  availability: {
    [day: string]: number[]; // Array of hours (0-23)
  };
  size?: number;
  description?: string;
}

const classrooms: Classroom[] = [
  { 
    id: '1', 
    name: "Lee's Classroom", 
    location: 'New York, USA', 
    x: 25, 
    y: 35, 
    interests: ['Math', 'Biology', 'Rock Climbing'],
    availability: { Mon: [9,10,11,14,15], Tue: [9,10,11], Wed: [14,15,16], Thu: [9,10,11], Fri: [14,15] }
  },
  { 
    id: '2', 
    name: 'Math Nerd House', 
    location: 'Los Angeles, USA', 
    x: 15, 
    y: 38, 
    interests: ['Math', 'Physics', 'Chess'],
    availability: { Mon: [10,11,12,13], Tue: [10,11,12], Wed: [15,16,17], Thu: [10,11], Fri: [14,15,16] }
  },
  { 
    id: '3', 
    name: 'The Book Nook', 
    location: 'London, UK', 
    x: 50, 
    y: 28, 
    interests: ['English', 'History', 'Creative Writing'],
    availability: { Mon: [9,10,11], Tue: [14,15,16], Wed: [9,10,11], Thu: [14,15,16], Fri: [9,10] }
  },
  { 
    id: '4', 
    name: "Marie's Language Lab", 
    location: 'Paris, France', 
    x: 51, 
    y: 32, 
    interests: ['French', 'Spanish', 'Mandarin'],
    availability: { Mon: [8,9,10], Tue: [8,9,10,11], Wed: [14,15], Thu: [8,9,10], Fri: [14,15,16] }
  },
  { 
    id: '5', 
    name: 'Sakura Study Space', 
    location: 'Tokyo, Japan', 
    x: 85, 
    y: 38, 
    interests: ['Japanese', 'Anime', 'Calligraphy', 'Math'],
    availability: { Mon: [13,14,15], Tue: [13,14,15,16], Wed: [13,14], Thu: [14,15,16], Fri: [13,14,15] }
  },
  { 
    id: '6', 
    name: 'Outback Learning Hub', 
    location: 'Sydney, Australia', 
    x: 88, 
    y: 68, 
    interests: ['Biology', 'Geography', 'Surfing'],
    availability: { Mon: [7,8,9], Tue: [7,8,9,10], Wed: [16,17,18], Thu: [7,8,9], Fri: [16,17,18] }
  },
  { 
    id: '7', 
    name: 'TechHub Singapore', 
    location: 'Singapore', 
    x: 78, 
    y: 52, 
    interests: ['Computer Science', 'Robotics', 'Math'],
    availability: { Mon: [10,11,12,13], Tue: [10,11,12], Wed: [14,15,16], Thu: [10,11,12], Fri: [14,15] }
  },
  { 
    id: '8', 
    name: "Priya's Practice Room", 
    location: 'Mumbai, India', 
    x: 72, 
    y: 45, 
    interests: ['Hindi', 'Music', 'Dance', 'Math'],
    availability: { Mon: [15,16,17], Tue: [15,16,17], Wed: [9,10,11], Thu: [15,16,17], Fri: [9,10,11] }
  },
  { 
    id: '9', 
    name: 'Samba Study Circle', 
    location: 'São Paulo, Brazil', 
    x: 35, 
    y: 65, 
    interests: ['Portuguese', 'Music', 'Dance', 'Biology'],
    availability: { Mon: [11,12,13], Tue: [11,12,13,14], Wed: [16,17,18], Thu: [11,12,13], Fri: [16,17] }
  },
  { 
    id: '10', 
    name: 'Alpine Academic Circle', 
    location: 'Frankfurt, Germany', 
    x: 52, 
    y: 30, 
    interests: ['German', 'Chemistry', 'Physics', 'Hiking'],
    availability: { Mon: [8,9,10,11], Tue: [14,15,16], Wed: [8,9,10], Thu: [14,15,16], Fri: [8,9,10] }
  },
  { 
    id: '11', 
    name: 'The Knit & Wit', 
    location: 'Stockholm, Sweden', 
    x: 54, 
    y: 22, 
    interests: ['Knitting', 'Crafts', 'Design', 'Swedish'],
    availability: { Mon: [13,14,15], Tue: [9,10,11], Wed: [13,14,15], Thu: [9,10,11], Fri: [13,14,15] }
  },
  { 
    id: '12', 
    name: 'Seoul Study Station', 
    location: 'Seoul, South Korea', 
    x: 83, 
    y: 36, 
    interests: ['Korean', 'K-Pop', 'Art', 'Math'],
    availability: { Mon: [16,17,18], Tue: [10,11,12], Wed: [16,17,18], Thu: [10,11,12], Fri: [16,17] }
  },
];

interface MapViewProps {
  onClassroomSelect: (classroom: Classroom) => void;
  selectedClassroom?: Classroom;
  myClassroom: Account;
}

export default function MapView({ onClassroomSelect, selectedClassroom, myClassroom }: MapViewProps) {
  const [hoveredClassroom, setHoveredClassroom] = useState<string | null>(null);

  // Calculate relevancy for each classroom
  const calculateRelevancy = (classroom: Classroom) => {
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

  // Get my classroom coordinates
  const myClassroomX = myClassroom.x;
  const myClassroomY = myClassroom.y;

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 rounded-lg overflow-hidden border border-slate-200">
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#94a3b8" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* World map with classroom markers */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        {/* Connection line from my classroom to selected classroom */}
        {selectedClassroom && (
          <line
            x1={myClassroomX}
            y1={myClassroomY}
            x2={selectedClassroom.x}
            y2={selectedClassroom.y}
            stroke="#3b82f6"
            strokeWidth="0.15"
            opacity="0.6"
            strokeDasharray="0.5,0.5"
          />
        )}

        {/* My classroom marker (purple) */}
        <g>
          {/* Pulse animation */}
          <circle
            cx={myClassroomX}
            cy={myClassroomY}
            r="2"
            fill="#a855f7"
            opacity="0.3"
            className="animate-ping"
          />
          
          {/* Main marker */}
          <circle
            cx={myClassroomX}
            cy={myClassroomY}
            r="1.2"
            fill="#a855f7"
            className="cursor-pointer"
            style={{ filter: 'drop-shadow(0 0 4px #a855f7)' }}
          />

          {/* Label */}
          <g>
            <rect
              x={myClassroomX + 1.5}
              y={myClassroomY - 2}
              width="16"
              height="3"
              fill="#1e293b"
              rx="0.3"
              opacity="0.95"
            />
            <text
              x={myClassroomX + 2}
              y={myClassroomY - 0.2}
              fontSize="1.1"
              fill="#a855f7"
              className="pointer-events-none"
            >
              {myClassroom.classroomName} (You)
            </text>
          </g>
        </g>

        {/* Other classroom markers */}
        {classrooms.map((classroom) => {
          const isSelected = selectedClassroom?.id === classroom.id;
          const isHovered = hoveredClassroom === classroom.id;
          const nodeColor = calculateRelevancy(classroom);
          
          return (
            <g key={classroom.id}>
              {/* Pulse animation for selected classroom */}
              {isSelected && (
                <circle
                  cx={classroom.x}
                  cy={classroom.y}
                  r="2"
                  fill="#3b82f6"
                  opacity="0.3"
                  className="animate-ping"
                />
              )}
              
              {/* Main marker */}
              <circle
                cx={classroom.x}
                cy={classroom.y}
                r={isSelected ? "1.2" : isHovered ? "1" : "0.8"}
                fill={isSelected ? "#3b82f6" : nodeColor}
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHoveredClassroom(classroom.id)}
                onMouseLeave={() => setHoveredClassroom(null)}
                onClick={() => onClassroomSelect(classroom)}
                style={{ filter: isSelected || isHovered ? 'drop-shadow(0 0 3px currentColor)' : 'none' }}
              />
              
              {/* Classroom label on hover/select */}
              {(isHovered || isSelected) && (
                <g>
                  <rect
                    x={classroom.x + 1.5}
                    y={classroom.y - 2}
                    width="16"
                    height="3"
                    fill="#1e293b"
                    rx="0.3"
                    opacity="0.95"
                  />
                  <text
                    x={classroom.x + 2}
                    y={classroom.y - 0.2}
                    fontSize="1.1"
                    fill="white"
                    className="pointer-events-none"
                  >
                    {classroom.name}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Classroom count badge */}
      <div className="absolute top-6 left-6">
        <Badge variant="secondary" className="bg-slate-900/80 backdrop-blur-sm text-slate-200 border-slate-700">
          {classrooms.length} Classrooms Available
        </Badge>
      </div>

      {/* Timezone Clock */}
      <TimezoneClock />
    </div>
  );
}

export { classrooms };
