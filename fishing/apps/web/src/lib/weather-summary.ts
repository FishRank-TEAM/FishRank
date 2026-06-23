import type { WeatherDay, WeatherSlot } from '@/lib/weather';

export function windLabel(speed: number): string {
  if (speed < 3) return '약함';
  if (speed < 6) return '보통';
  if (speed < 9) return '강함';
  return '매우 강함';
}

export function precipLabel(pop: number | null | undefined): string {
  if (pop == null) return '-';
  if (pop < 20) return '거의 없음';
  if (pop < 50) return '가끔';
  if (pop < 70) return '올 수 있음';
  return '많음';
}

export function tripVerdict(score: number, windSpeed: number, pop: number | null | undefined) {
  if (score >= 4 && windSpeed < 6 && (pop ?? 0) < 50) {
    return { label: '출조 추천', color: '#2e7d32', emoji: '🎣' };
  }
  if (score >= 3 && windSpeed < 8) {
    return { label: '출조 가능', color: '#388e3c', emoji: '✅' };
  }
  if (score >= 2) {
    return { label: '출조 주의', color: '#f57c00', emoji: '⚠️' };
  }
  return { label: '출조 비추', color: '#d32f2f', emoji: '⛔' };
}

function periodSky(slots: WeatherSlot[], from: number, to: number): string {
  const slice = slots.filter((s) => s.hour >= from && s.hour < to);
  if (slice.length === 0) return '맑음';
  const counts = new Map<string, number>();
  for (const s of slice) {
    counts.set(s.skyLabel, (counts.get(s.skyLabel) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '맑음';
}

export function daySummary(day: WeatherDay): string {
  const { slots } = day;
  const morning = periodSky(slots, 6, 12);
  const afternoon = periodSky(slots, 12, 18);
  const evening = periodSky(slots, 18, 24);

  if (morning === afternoon && afternoon === evening) {
    return `하루 종일 ${morning}`;
  }
  if (morning === afternoon) {
    return `오전·낮 ${morning}, 저녁 ${evening}`;
  }
  return `오전 ${morning}, 오후 ${afternoon}, 저녁 ${evening}`;
}

export function weekDayShort(date: string): string {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(4, 6));
  const d = Number(date.slice(6, 8));
  const dt = new Date(y, m - 1, d);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[dt.getDay()];
}

export function dominantSkyEmoji(day: WeatherDay): string {
  const slot = day.slots.find((s) => s.hasForecast !== false) ?? day.slots[12] ?? day.slots[0];
  if (!slot) return '☀️';
  if ([1, 2, 3, 4].includes(slot.precipitationType)) return '🌧️';
  if (slot.sky === 1) return '☀️';
  if (slot.sky === 3) return '⛅';
  return '☁️';
}

export function dominantSkyLabel(day: WeatherDay): string {
  const slice = day.slots.filter((s) => s.hasForecast !== false);
  const source = slice.length > 0 ? slice : day.slots;
  const counts = new Map<string, number>();
  for (const slot of source) {
    if (!slot.skyLabel || slot.skyLabel === '-') continue;
    counts.set(slot.skyLabel, (counts.get(slot.skyLabel) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '맑음';
}

export function dayPrecipSummary(day: WeatherDay): string {
  const rainy = day.slots.some((s) => [1, 2, 3, 4].includes(s.precipitationType));
  const pop = day.maxPrecipProb;
  if (!rainy && (pop == null || pop < 20)) return '강수 없음';
  if (pop != null && pop >= 60) return '비 올 수 있음';
  if (pop != null && pop >= 30) return '가끔 비';
  return rainy ? '비' : '강수 없음';
}

export function shortDayLabel(date: string, index: number): string {
  if (index === 0) return '오늘';
  if (index === 1) return '내일';
  if (index === 2) return '모레';
  return weekDayShort(date);
}

export function formatTempRange(min: number | null, max: number | null): string | null {
  if (min != null && max != null) return `${min}° / ${max}°`;
  if (max != null) return `${max}°`;
  if (min != null) return `${min}°`;
  return null;
}

export function resolveDayTempRange(
  day: WeatherDay,
  currentTemp?: number | null,
): { min: number | null; max: number | null } {
  let min = day.minTemp;
  let max = day.maxTemp;
  const temps = day.slots.map((s) => s.temp).filter((t): t is number => t != null);
  if (currentTemp != null) temps.push(currentTemp);

  if (temps.length) {
    const slotMin = Math.min(...temps);
    const slotMax = Math.max(...temps);
    min = min != null ? Math.min(min, slotMin) : slotMin;
    max = max != null ? Math.max(max, slotMax) : slotMax;
  }

  return { min, max };
}
