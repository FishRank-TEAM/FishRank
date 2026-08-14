'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import ConditionsExplorer from '@/components/conditions/ConditionsExplorer';
import WeatherLocationBar from '@/components/weather/WeatherLocationBar';
import { WeatherPageSkeleton } from '@/components/weather/WeatherSkeleton';
import { useWeatherLocation } from '@/hooks/useWeather';
import type { ReservoirViewMode } from '@/lib/marine-conditions';

export default function ConditionsPage() {
  return (
    <Suspense fallback={<WeatherPageSkeleton />}>
      <ConditionsPageContent />
    </Suspense>
  );
}

function ConditionsPageContent() {
  const searchParams = useSearchParams();
  const { location, setLocation, requestGps, gpsLoading, gpsError } = useWeatherLocation();
  const [countyQuery, setCountyQuery] = useState(searchParams.get('q') ?? '');

  const initialReservoirView = useMemo<ReservoirViewMode>(() => {
    return searchParams.get('view') === 'list' ? 'list' : 'map';
  }, [searchParams]);

  return (
    <main>
      <PageHeader
        title="출조 · 수위"
        description="물때 · 바다낚시지수 · 저수지 수위"
      />

      <div className="site-container site-page-body weather-page">
        <WeatherLocationBar
          location={location}
          onLocationChange={setLocation}
          onGpsRequest={requestGps}
          gpsLoading={gpsLoading}
          gpsError={gpsError}
        />

        <div className="conditions-county-search">
          <label htmlFor="county-q">시·군·구 검색 (전국)</label>
          <div className="conditions-county-search-row">
            <input
              id="county-q"
              type="search"
              placeholder="예: 구미, 충주, 여주, 경북, 전남 (비우면 선택 위치의 시·군·구)"
              value={countyQuery}
              onChange={(e) => setCountyQuery(e.target.value)}
            />
            {countyQuery && (
              <button type="button" className="site-btn-sm" onClick={() => setCountyQuery('')}>
                초기화
              </button>
            )}
          </div>
        </div>

        <ConditionsExplorer
          location={location}
          initialReservoirView={initialReservoirView}
          countyQuery={countyQuery.trim()}
        />
      </div>
    </main>
  );
}
