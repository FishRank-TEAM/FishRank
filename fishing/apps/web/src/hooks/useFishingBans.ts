'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export type FishingBanKind = 'prohibit' | 'restrict' | 'protect';

export type FishingBanZone = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusM: number;
  kind: FishingBanKind;
  reason: string;
  sido?: string;
  address?: string;
  source: string;
  sourceDate?: string;
  path?: Array<{ lat: number; lng: number }>;
};

export type FishingBanResponse = {
  zones: FishingBanZone[];
  disclaimer: string;
  sources: string[];
  updatedAt: string | null;
};

export function useFishingBans(
  center: { lat: number; lng: number } | null,
  enabled = true,
  radiusKm = 100,
) {
  const query = useQuery({
    queryKey: [
      'fishing-bans',
      center ? Number(center.lat.toFixed(2)) : null,
      center ? Number(center.lng.toFixed(2)) : null,
      radiusKm,
    ],
    queryFn: async () => {
      const res = await api.get('/weather/fishing-bans', {
        params: {
          lat: center!.lat,
          lng: center!.lng,
          radiusKm,
        },
      });
      return res.data.data as FishingBanResponse;
    },
    enabled: enabled && !!center,
    staleTime: 30 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  return {
    zones: query.data?.zones ?? [],
    disclaimer: query.data?.disclaimer ?? '',
    sources: query.data?.sources ?? [],
    updatedAt: query.data?.updatedAt ?? null,
    loading: query.isLoading,
    fetching: query.isFetching,
    error: query.isError,
  };
}
