export const formatMeetingDateTime = (dateInput: string): string => {
  const date = new Date(dateInput);
  const weekday = date.toLocaleDateString(undefined, { weekday: 'short' });
  const day = date.toLocaleDateString(undefined, { day: 'numeric' });
  const month = date.toLocaleDateString(undefined, { month: 'short' });
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${weekday} ${day} ${month} ${time}`;
};

export const formatMeetingTimeRange = (startInput: string, endInput: string): string => {
  const start = new Date(startInput);
  const end = new Date(endInput);
  const weekday = start.toLocaleDateString(undefined, { weekday: 'short' });
  const day = start.toLocaleDateString(undefined, { day: 'numeric' });
  const month = start.toLocaleDateString(undefined, { month: 'short' });
  const startTime = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endTime = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${weekday} ${day} ${month} ${startTime} - ${endTime}`;
};

export const toTitleCase = (str: string): string => {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const formatScheduleToString = (hours: number[] | undefined): string => {
  if (!hours || hours.length === 0) return '';
  return hours.sort((a, b) => a - b).join(', ');
};

export const formatScheduleRanges = (hours: number[] | undefined): string => {
  if (!hours || hours.length === 0) return 'Not available';

  const sorted = [...hours].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== prev + 1) {
      ranges.push(`${start}:00 - ${prev + 1}:00`);
      start = sorted[i];
    }
    prev = sorted[i];
  }
  ranges.push(`${start}:00 - ${prev + 1}:00`);

  return ranges.join(', ');
};

export const parseScheduleInput = (input: string): number[] => {
  const parts = input.split(/[,;\s]+/);
  const hours = new Set<number>();

  parts.forEach(part => {
    if (!part) return;

    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end - 1; i++) {
          if (i >= 0 && i <= 23) hours.add(i);
        }
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num >= 0 && num <= 23) {
        hours.add(num);
      }
    }
  });

  return Array.from(hours).sort((a, b) => a - b);
};
