'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { WeatherLocation } from '@/lib/weather';
import type { ReservoirAreaData, ReservoirMapItem } from '@/lib/marine-conditions';

const STALE_MS = 20 * 60 * 1000;

async function fetchReservoirArea(
  location: WeatherLocation,
  countyQuery?: string,
): Promise<ReservoirAreaData> {
  const res = await api.get('/weather/reservoirs/area', {
    params: {
      lat: location.lat,
      lng: location.lng,
      ...(countyQuery ? { q: countyQuery } : {}),
    },
  });
  const data = res.data.data;
  return {
    spot: data.spot ?? null,
    searchQuery: data.searchQuery,
    center: data.center ?? { lat: location.lat, lng: location.lng },
    totalCount: data.totalCount ?? (data.rows ?? []).length,
    rows: (data.rows ?? []).map((row: ReservoirMapItem & { geocoded?: boolean }) => ({
      ...(row as ReservoirMapItem),
      geocoded: row.geocoded === true,
    })),
  };
}

/** 지도 조회용 — 너무 촘촘한 좌표 변경으로 재요청이 폭주하지 않게 반올림 */
export function reservoirQueryKey(lat: number, lng: number, countyQuery = '') {
  return [
    'reservoir-area',
    Number(lat.toFixed(2)),
    Number(lng.toFixed(2)),
    countyQuery.trim(),
  ] as const;
}

export function useReservoirArea(
  location: WeatherLocation | null,
  enabled = true,
  countyQuery = '',
) {
  const q = countyQuery.trim();
  const query = useQuery({
    queryKey: location
      ? reservoirQueryKey(location.lat, location.lng, q)
      : ['reservoir-area', null, null, q],
    queryFn: () => fetchReservoirArea(location!, q || undefined),
    enabled: enabled && !!location,
    staleTime: STALE_MS,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    // 이전 결과를 유지해 마커가 통째로 사라지지 않게
    placeholderData: (previous) => previous,
  });

  return {
    area: query.data ?? null,
    loading: query.isLoading,
    fetching: query.isFetching,
    error: query.isError,
  };
}
