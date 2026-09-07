'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import ConditionsExplorer from '@/components/conditions/ConditionsExplorer';
import ConditionsMapHub, { type MapLayerKey } from '@/components/conditions/ConditionsMapHub';
import ConditionsWeatherStrip from '@/components/conditions/ConditionsWeatherStrip';
import WeatherLocationBar from '@/components/weather/WeatherLocationBar';
import { WeatherPageSkeleton } from '@/components/weather/WeatherSkeleton';
import { useWeatherLocation } from '@/hooks/useWeather';
import type { SeaFishingGubun } from '@/lib/marine-conditions';

export default function ConditionsPage() {
  return (
    <Suspense fallback={<WeatherPageSkeleton />}>
      <ConditionsPageContent />
    </Suspense>
  );
}

function parseLayers(raw: string | null): Partial<Record<MapLayerKey, boolean>> {
  if (!raw) return {};
  const set = new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
  if (set.size === 0) return {};
  return {
    sea: set.has('sea'),
    fresh: set.has('fresh'),
    reservoir: set.has('reservoir'),
    ban: set.has('ban'),
  };
}

function layersToParam(layers: Record<MapLayerKey, boolean>): string {
  return (['sea', 'fresh', 'reservoir', 'ban'] as const)
    .filter((k) => layers[k])
    .join(',');
}

function ConditionsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { location, setLocation, requestGps, gpsLoading, gpsError } = useWeatherLocation();

  const [countyQuery, setCountyQuery] = useState(searchParams.get('q') ?? '');
  const [gubun, setGubun] = useState<SeaFishingGubun>(
    searchParams.get('gubun') === '선상' ? '선상' : '갯바위',
  );

  const initialLayers = useMemo(
    () => parseLayers(searchParams.get('layers')),
    [searchParams],
  );

  const [layers, setLayers] = useState<Record<MapLayerKey, boolean>>(() => ({
    sea: true,
    fresh: true,
    reservoir: true,
    ban: true,
    ...initialLayers,
  }));

  const syncUrl = useCallback(
    (next: {
      q?: string;
      gubun?: SeaFishingGubun;
      layers?: Record<MapLayerKey, boolean>;
    }) => {
      const params = new URLSearchParams();
      const q = next.q !== undefined ? next.q : countyQuery;
      if (q) params.set('q', q);
      const nextGubun = next.gubun ?? gubun;
      if (nextGubun === '선상') params.set('gubun', '선상');
      const nextLayers = next.layers ?? layers;
      const layerParam = layersToParam(nextLayers);
      if (layerParam && layerParam !== 'sea,fresh,reservoir,ban') {
        params.set('layers', layerParam);
      }
      // legacy redirects from mode=fresh etc. — ignore mode
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [countyQuery, gubun, layers, pathname, router],
  );

  const handleCountyApply = (q: string) => {
    setCountyQuery(q);
    syncUrl({ q });
  };

  const handleGubunChange = (next: SeaFishingGubun) => {
    setGubun(next);
    syncUrl({ gubun: next });
  };

  const handleLayersChange = (next: Record<MapLayerKey, boolean>) => {
    setLayers(next);
    syncUrl({ layers: next });
  };

  return (
    <main>
      <PageHeader
        title="출조"
        description="지도에서 포인트·저수지·물때를 확인하세요"
      />

      <div className="site-container site-page-body weather-page conditions-page">
        <WeatherLocationBar
          location={location}
          onLocationChange={setLocation}
          onGpsRequest={requestGps}
          gpsLoading={gpsLoading}
          gpsError={gpsError}
        />

        <ConditionsWeatherStrip location={location} />

        <ConditionsMapHub
          location={location}
          onLocationChange={setLocation}
          countyQuery={countyQuery}
          onCountyQueryChange={handleCountyApply}
          layers={layers}
          onLayersChange={handleLayersChange}
        />

        <ConditionsExplorer
          location={location}
          gubun={gubun}
          onGubunChange={handleGubunChange}
        />
      </div>
    </main>
  );
}
