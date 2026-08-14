export type SeaFishingIndexRow = {
  placeName: string | null;
  fishName: string | null;
  fishingIndexLabel: string | null;
  waterTemp: number | null;
  waveHeight: number | null;
  tideLabel: string | null;
};

export type TideForecastPoint = {
  obsCode: string;
  name: string;
  lat: number;
  lng: number;
};

export type TideForecastRow = {
  forecastAt: string | null;
  tideLevelCm: number | null;
};

export type TideEventKhoa = {
  time: string;
  label: '만조' | '간조';
  levelCm: number;
};

export type ReservoirSummary = {
  facCode: string;
  facName: string;
  county: string | null;
  ratePercent: number | null;
  waterLevelM: number | null;
  checkDate: string | null;
};

export type ReservoirMapItem = ReservoirSummary & {
  lat: number;
  lng: number;
  geocoded?: boolean;
};

export type ReservoirAreaData = {
  spot: string | null;
  searchQuery?: string;
  center: { lat: number; lng: number };
  totalCount?: number;
  rows: ReservoirMapItem[];
};

export type MarineConditionsData = {
  fishing: {
    rows: SeaFishingIndexRow[];
    placeName: string | null;
  };
  tide: {
    point: TideForecastPoint;
    events: TideEventKhoa[];
    rows: TideForecastRow[];
  };
  reservoir: ReservoirSummary | null;
  freshwaterArea: boolean;
  reservoirSpot: string | null;
};

export function extractTideEvents(rows: TideForecastRow[]): TideEventKhoa[] {
  const sorted = rows
    .filter((r) => r.forecastAt && r.tideLevelCm != null)
    .sort((a, b) => (a.forecastAt ?? '').localeCompare(b.forecastAt ?? ''));

  const events: TideEventKhoa[] = [];
  for (let i = 1; i < sorted.length - 1; i += 1) {
    const prev = sorted[i - 1].tideLevelCm!;
    const curr = sorted[i].tideLevelCm!;
    const next = sorted[i + 1].tideLevelCm!;
    const time = formatTideClock(sorted[i].forecastAt!);

    if (curr >= prev && curr >= next) {
      events.push({ time, label: '만조', levelCm: Math.round(curr) });
    } else if (curr <= prev && curr <= next) {
      events.push({ time, label: '간조', levelCm: Math.round(curr) });
    }
  }

  return events.slice(0, 4);
}

export function dedupeTideEvents(events: TideEventKhoa[]): TideEventKhoa[] {
  const seen = new Set<string>();
  return events.filter((ev) => {
    const key = `${ev.time}-${ev.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatTideClock(forecastAt: string): string {
  const m = forecastAt.match(/(\d{2}):(\d{2})/);
  if (m) return `${m[1]}:${m[2]}`;
  if (forecastAt.length >= 16) return forecastAt.slice(11, 16);
  return forecastAt;
}

export function fishingIndexSummary(rows: SeaFishingIndexRow[]): string | null {
  if (!rows.length) return null;
  const top = rows.find((r) => r.fishName && r.fishName !== '기타어종') ?? rows[0];
  const place = top.placeName ?? '연안';
  const fish = top.fishName ?? '어종';
  const idx = top.fishingIndexLabel ?? '-';
  return `${place} · ${fish} ${idx}`;
}

export function indexLabelColor(label: string | null): string {
  if (!label) return '#6b7280';
  if (/매우|최|아주|great|excellent/i.test(label) || label === '좋음') return '#16a34a';
  if (/보통|normal/i.test(label)) return '#2563eb';
  if (/나쁨|bad|poor/i.test(label)) return '#dc2626';
  return '#6b7280';
}

export function reservoirRateColor(rate: number | null): string {
  if (rate == null) return '#9ca3af';
  if (rate >= 60) return '#2563eb';
  if (rate >= 40) return '#f59e0b';
  return '#dc2626';
}

export function reservoirBubbleSize(rate: number | null): number {
  if (rate == null) return 32;
  return Math.round(28 + Math.min(rate, 100) * 0.16);
}

export type ReservoirViewMode = 'map' | 'list';

export function formatCheckDate(checkDate: string): string {
  if (checkDate.length === 8) {
    return `${checkDate.slice(0, 4)}-${checkDate.slice(4, 6)}-${checkDate.slice(6, 8)}`;
  }
  return checkDate;
}
