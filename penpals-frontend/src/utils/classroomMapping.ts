import type { Classroom } from '../types';
import type { ClassroomDetails } from '../services/classroom';

export const transformAvailability = (backendAvailability: any): { [day: string]: number[] } => {
  if (!backendAvailability) return {};

  // Case 1: Already in object format: { Mon: [9, 10], ... }
  if (typeof backendAvailability === 'object' && !Array.isArray(backendAvailability)) {
    const cleanSchedule: { [day: string]: number[] } = {};
    Object.entries(backendAvailability).forEach(([day, hours]) => {
      if (Array.isArray(hours)) {
        cleanSchedule[day] = hours.map(h => Number(h)).filter(h => !isNaN(h));
      }
    });
    return cleanSchedule;
  }

  // Case 2: Legacy array format: [{ day: 'Mon', time: '10:00' }, ...]
  const schedule: { [day: string]: number[] } = {};
  if (Array.isArray(backendAvailability)) {
    backendAvailability.forEach(slot => {
      if (slot.day && slot.time) {
        const hour = parseInt(String(slot.time).split(':')[0], 10);
        if (!isNaN(hour)) {
          if (!schedule[slot.day]) {
            schedule[slot.day] = [];
          }
          if (!schedule[slot.day].includes(hour)) {
            schedule[slot.day].push(hour);
          }
        }
      }
    });
  }
  return schedule;
};

export const mapClassroomDetailsToClassroom = (details: ClassroomDetails): Classroom => ({
  id: String(details.id),
  name: details.name,
  location: details.location || 'Unknown Location',
  lat: details.latitude ? parseFloat(details.latitude) : 0,
  lon: details.longitude ? parseFloat(details.longitude) : 0,
  interests: details.interests || [],
  availability: transformAvailability(details.availability),
  size: details.class_size,
  description: details.description || `Friends: ${details.friends_count || 0}`,
  avatar: details.avatar || '',
});
