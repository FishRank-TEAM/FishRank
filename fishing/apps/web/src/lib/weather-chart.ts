import type { WeatherSlot } from '@/lib/weather';

export type ChartPoint = {
  hour: number;
  label: string;
  temp: number | null;
  score: number;
  wind: number;
  pop: number | null;
  fishLabel: string;
  fishColor: string;
  skyEmoji: string;
  isEstimated: boolean;
  isCurrent: boolean;
};

export function slotsToChartData(slots: WeatherSlot[], skyFn: (sky: number, pty: number) => string): ChartPoint[] {
  return slots.map((slot) => ({
    hour: slot.hour,
    label: `${String(slot.hour).padStart(2, '0')}시`,
    temp: slot.temp,
    score: slot.fishingCondition.score,
    wind: slot.windSpeed,
    pop: slot.precipitationProb,
    fishLabel: slot.fishingCondition.label,
    fishColor: slot.fishingCondition.color,
    skyEmoji: skyFn(slot.sky, slot.precipitationType),
    isEstimated: Boolean(slot.isEstimated),
    isCurrent: Boolean(slot.isCurrent),
  }));
}

export function tempDomain(points: ChartPoint[]): [number, number] {
  const temps = points.map((p) => p.temp).filter((t): t is number => t != null);
  if (temps.length === 0) return [0, 30];
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const pad = Math.max(2, Math.round((max - min) * 0.15));
  return [Math.floor(min - pad), Math.ceil(max + pad)];
}
