'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
  formatActivityRegion,
  formatActivityRegionLabel,
  getRegionDisplayName,
  parseActivityRegion,
  type RegionLevel,
} from '@/lib/korean-regions';
import { useAuthStore } from '@/store/auth.store';

export type RegionalAnchor = {
  province: string;
  district: string;
  lat: number;
  lng: number;
};

export const DEFAULT_REGION_ANCHOR: RegionalAnchor = {
  province: '서울',
  district: '강남',
  lat: 37.5172,
  lng: 127.0473,
};

export function regionKeyForLevel(
  anchor: RegionalAnchor,
  level: RegionLevel,
): { key: string; name: string } {
  if (level === 'sido') {
    return {
      key: anchor.province,
      name: getRegionDisplayName(anchor.province, 'sido'),
    };
  }

  const district = anchor.district || anchor.province;
  const key = formatActivityRegion(anchor.province, district);
  return {
    key,
    name: formatActivityRegionLabel(key),
  };
}

export function anchorFromRegionKey(regionKey: string, level: RegionLevel): RegionalAnchor {
  if (level === 'sido') {
    return { ...DEFAULT_REGION_ANCHOR, province: regionKey, district: '' };
  }

  const parsed = parseActivityRegion(regionKey);
  if (parsed?.district) {
    return { ...DEFAULT_REGION_ANCHOR, province: parsed.province, district: parsed.district };
  }

  return { ...DEFAULT_REGION_ANCHOR, province: regionKey, district: '' };
}

export function useRegionalAnchor() {
  const { isLoggedIn } = useAuthStore();
  const [anchor, setAnchor] = useState<RegionalAnchor | null>(null);

  useEffect(() => {
    let cancelled = false;

    const finish = (next: RegionalAnchor) => {
      if (!cancelled) setAnchor(next);
    };

    const resolve = async () => {
      if (isLoggedIn) {
        try {
          const res = await api.get('/users/me');
          const parsed = parseActivityRegion(res.data.data?.activityRegion);
          if (parsed?.province) {
            let lat = DEFAULT_REGION_ANCHOR.lat;
            let lng = DEFAULT_REGION_ANCHOR.lng;
            try {
              const search = await api.get('/weather/search', {
                params: { q: formatActivityRegionLabel(res.data.data.activityRegion) },
              });
              const place = search.data.data?.[0];
              if (place?.lat && place?.lng) {
                lat = place.lat;
                lng = place.lng;
              }
            } catch {
              // keep default coords
            }
            finish({
              province: parsed.province,
              district: parsed.district,
              lat,
              lng,
            });
            return;
          }
        } catch {
          // fall through
        }
      }

      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolvePos, reject) => {
            navigator.geolocation.getCurrentPosition(resolvePos, reject, {
              enableHighAccuracy: false,
              timeout: 5000,
              maximumAge: 300000,
            });
          });

          const res = await api.get('/weather/reverse', {
            params: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          });
          const data = res.data.data;
          if (data?.province) {
            finish({
              province: data.province,
              district: data.district ?? '',
              lat: data.lat ?? pos.coords.latitude,
              lng: data.lng ?? pos.coords.longitude,
            });
            return;
          }
        } catch {
          // fall through
        }
      }

      finish(DEFAULT_REGION_ANCHOR);
    };

    void resolve();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  return anchor;
}
