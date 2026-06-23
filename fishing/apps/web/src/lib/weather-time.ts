export type TimePeriod = 'all' | 'dawn' | 'morning' | 'day' | 'evening' | 'night';

export const TIME_PERIODS: { id: TimePeriod; label: string; hours: number[] }[] = [
  { id: 'all', label: '전체', hours: Array.from({ length: 24 }, (_, i) => i) },
  { id: 'dawn', label: '새벽', hours: [0, 1, 2, 3, 4, 5] },
  { id: 'morning', label: '아침', hours: [6, 7, 8, 9, 10, 11] },
  { id: 'day', label: '낮', hours: [12, 13, 14, 15, 16, 17] },
  { id: 'evening', label: '저녁', hours: [18, 19, 20, 21] },
  { id: 'night', label: '밤', hours: [22, 23] },
];

export function formatDateInput(date: string): string {
  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
}

export function parseDateInput(value: string): string {
  return value.replace(/-/g, '');
}

export function formatTimeInput(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

export function parseTimeInput(value: string): number {
  const [h] = value.split(':');
  const hour = Number(h);
  if (Number.isNaN(hour)) return 0;
  return Math.min(23, Math.max(0, hour));
}

export function parseClockTime(time: string): number {
  const [h] = time.split(':');
  const hour = Number(h);
  return Number.isNaN(hour) ? 0 : Math.min(23, Math.max(0, hour));
}

export function slotTimeKey(date: string, hour: number): string {
  return `${date}${String(hour).padStart(2, '0')}00`;
}
