'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { WeatherLocation } from '@/lib/weather';
import {
  extractTideEvents,
  type MarineConditionsData,
  type SeaFishingIndexRow,
  type TideForecastPoint,
  type TideForecastRow,
} from '@/lib/marine-conditions';

const STALE_MS = 15 * 60 * 1000;

const EMPTY_TIDE = {
  point: { obsCode: '', name: '', lat: 0, lng: 0 } as TideForecastPoint,
  events: [],
  rows: [] as TideForecastRow[],
};

async function fetchMarineConditions(location: WeatherLocation): Promise<MarineConditionsData> {
  const { lat, lng } = location;

  const [fishingSettled, tideSettled] = await Promise.allSettled([
    api.get('/weather/fishing-index', { params: { gubun: '갯바위', lat, lng } }),
    api.get('/weather/tide-forecast', { params: { lat, lng } }),
  ]);

  const fishingRows = fishingSettled.status === 'fulfilled'
    ? ((fishingSettled.value.data.data?.rows ?? []) as SeaFishingIndexRow[])
    : [];

  const tideData = tideSettled.status === 'fulfilled' ? tideSettled.value.data.data : null;
  const point = (tideData?.point ?? EMPTY_TIDE.point) as TideForecastPoint;
  const tideRows = (tideData?.rows ?? []) as TideForecastRow[];

  return {
    fishing: {
      rows: fishingRows.slice(0, 6),
      placeName: fishingRows[0]?.placeName ?? null,
    },
    tide: {
      point,
      events: extractTideEvents(tideRows),
      rows: tideRows.slice(0, 8),
    },
    reservoir: null,
    freshwaterArea: false,
    reservoirSpot: null,
  };
}

export function useMarineConditions(location: WeatherLocation | null, enabled = true) {
  const query = useQuery({
    queryKey: [
      'marine-conditions',
      location ? Number(location.lat.toFixed(3)) : null,
      location ? Number(location.lng.toFixed(3)) : null,
    ],
    queryFn: () => fetchMarineConditions(location!),
    enabled: enabled && !!location,
    staleTime: STALE_MS,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });

  return {
    marine: query.data ?? null,
    loading: query.isLoading,
    fetching: query.isFetching,
  };
}
