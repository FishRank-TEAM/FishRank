import { getFishingCondition, type FishingCondition } from './fishing-condition';
import {
  formatDateLabel,
  formatHourLabel,
  ptyToLabel,
  skyToLabel,
  windDirectionLabel,
} from './kma-parser';
import { getSunMoonInfo } from './sun-moon';
import { getTideInfo } from './tide';
import type { WeatherSlot } from './weather.service';

export function fill24HourSlots(date: string, slots: WeatherSlot[]): WeatherSlot[] {
  const byHour = new Map(slots.map((s) => [s.hour, s]));
  const withData = slots.filter((s) => s.hasForecast);
  const fallback = withData[0] ?? slots[0];

  return Array.from({ length: 24 }, (_, hour) => {
    const existing = byHour.get(hour);
    if (existing) return existing;
    return buildEstimatedSlot(date, hour, withData.length > 0 ? withData : slots, fallback);
  });
}

function buildEstimatedSlot(
  date: string,
  hour: number,
  sources: WeatherSlot[],
  fallback: WeatherSlot | undefined,
): WeatherSlot {
  if (!fallback) {
    return emptySlot(date, hour);
  }

  const nearest = findNearestSlot(hour, sources);
  const temp = nearest.temp ?? fallback.temp;
  const windSpeed = nearest.windSpeed ?? fallback.windSpeed;
  const precipitationType = nearest.precipitationType ?? fallback.precipitationType;
  const precipitation = nearest.precipitation ?? 0;
  const precipProb = nearest.precipitationProb ?? fallback.precipitationProb;

  return {
    time: `${date}${String(hour).padStart(2, '0')}00`,
    date,
    hour,
    hourLabel: formatHourLabel(hour),
    temp,
    humidity: nearest.humidity ?? fallback.humidity,
    windSpeed,
    windDirection: nearest.windDirection ?? fallback.windDirection,
    windDirectionLabel: nearest.windDirectionLabel ?? fallback.windDirectionLabel,
    precipitation,
    precipitationProb: precipProb,
    precipitationType,
    precipitationLabel: nearest.precipitationLabel ?? fallback.precipitationLabel,
    sky: nearest.sky ?? fallback.sky,
    skyLabel: nearest.skyLabel ?? fallback.skyLabel,
    wave: nearest.wave ?? fallback.wave,
    hasForecast: false,
    isEstimated: true,
    fishingCondition: getFishingCondition({
      temp: temp ?? 15,
      windSpeed,
      precipitation,
      precipitationType,
      precipitationProb: precipProb,
    }),
  };
}

function findNearestSlot(hour: number, sources: WeatherSlot[]): WeatherSlot {
  return sources.reduce((best, s) =>
    Math.abs(s.hour - hour) < Math.abs(best.hour - hour) ? s : best,
  sources[0]);
}

function emptySlot(date: string, hour: number): WeatherSlot {
  const fishingCondition: FishingCondition = {
    label: '예보 없음',
    color: '#9e9e9e',
    desc: '해당 시간 예보 데이터가 없습니다.',
    score: 0,
  };
  return {
    time: `${date}${String(hour).padStart(2, '0')}00`,
    date,
    hour,
    hourLabel: formatHourLabel(hour),
    temp: null,
    humidity: null,
    windSpeed: 0,
    windDirection: 0,
    windDirectionLabel: '-',
    precipitation: 0,
    precipitationProb: null,
    precipitationType: 0,
    precipitationLabel: '-',
    sky: 1,
    skyLabel: '-',
    wave: null,
    hasForecast: false,
    isEstimated: false,
    fishingCondition,
  };
}

export function addDateDays(dateStr: string, days: number): string {
  const y = Number(dateStr.slice(0, 4));
  const m = Number(dateStr.slice(4, 6));
  const d = Number(dateStr.slice(6, 8));
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, '0')}${String(dt.getDate()).padStart(2, '0')}`;
}

export function buildExtendedDays(
  days: Array<{
    date: string;
    dateLabel: string;
    minTemp: number | null;
    maxTemp: number | null;
    avgWindSpeed: number;
    maxPrecipProb: number | null;
    bestHour: number | null;
    bestScore: number;
    bestHours: number[];
    sunMoon: ReturnType<typeof getSunMoonInfo>;
    tide: ReturnType<typeof getTideInfo>;
    slots: WeatherSlot[];
  }>,
  lat: number,
  lng: number,
  totalDays = 7,
): typeof days {
  if (days.length === 0) return days;

  const dayMap = new Map(days.map((d) => [d.date, d]));
  const startDate = days[0].date;
  const template = days.find((d) => d.slots.some((s) => s.hasForecast)) ?? days[0];

  const result: typeof days = [];

  for (let i = 0; i < totalDays; i++) {
    const date = addDateDays(startDate, i);
    const existing = dayMap.get(date);

    if (existing) {
      result.push({
        ...existing,
        slots: fill24HourSlots(date, existing.slots),
      });
      continue;
    }

    const filled = fill24HourSlots(date, template.slots.map((s) => ({
      ...s,
      date,
      time: `${date}${String(s.hour).padStart(2, '0')}00`,
      hasForecast: false,
      isEstimated: true,
      isCurrent: false,
    })));

    const temps = filled.map((s) => s.temp).filter((t): t is number => t != null);
    result.push({
      date,
      dateLabel: formatDateLabel(date),
      minTemp: temps.length ? Math.min(...temps) : null,
      maxTemp: temps.length ? Math.max(...temps) : null,
      avgWindSpeed: template.avgWindSpeed,
      maxPrecipProb: null,
      bestHour: template.bestHour,
      bestScore: template.bestScore,
      bestHours: template.bestHours,
      sunMoon: getSunMoonInfo(lat, lng, date),
      tide: getTideInfo(lat, lng, date),
      slots: filled,
    });
  }

  return result;
}
