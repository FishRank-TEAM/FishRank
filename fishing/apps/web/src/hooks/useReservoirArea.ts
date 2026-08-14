'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { WeatherLocation } from '@/lib/weather';
import type { ReservoirAreaData, ReservoirMapItem } from '@/lib/marine-conditions';

const STALE_MS = 15 * 60 * 1000;

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

export function useReservoirArea(
  location: WeatherLocation | null,
  enabled = true,
  countyQuery = '',
) {
  const q = countyQuery.trim();
  const query = useQuery({
    queryKey: [
      'reservoir-area',
      location ? Number(location.lat.toFixed(3)) : null,
      location ? Number(location.lng.toFixed(3)) : null,
      q,
    ],
    queryFn: () => fetchReservoirArea(location!, q || undefined),
    enabled: enabled && !!location,
    staleTime: STALE_MS,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });

  return {
    area: query.data ?? null,
    loading: query.isLoading,
    fetching: query.isFetching,
    error: query.isError,
  };
}
