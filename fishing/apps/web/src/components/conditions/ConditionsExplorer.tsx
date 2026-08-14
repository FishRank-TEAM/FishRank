'use client';

import { useMemo } from 'react';
import type { WeatherLocation } from '@/lib/weather';
import type { ReservoirViewMode } from '@/lib/marine-conditions';
import { useMarineConditions } from '@/hooks/useMarineConditions';
import { useWeather } from '@/hooks/useWeather';
import SeaConditionsPanel from './SeaConditionsPanel';
import ReservoirExplorer from '@/components/weather/ReservoirExplorer';

type Props = {
  location: WeatherLocation;
  initialReservoirView?: ReservoirViewMode;
  countyQuery?: string;
};

export default function ConditionsExplorer({
  location,
  initialReservoirView = 'map',
  countyQuery = '',
}: Props) {
  const { marine, loading: marineLoading } = useMarineConditions(location);
  const { weather } = useWeather(location);

  const fallbackTide = useMemo(
    () => weather?.days[0]?.tide ?? null,
    [weather?.days],
  );

  return (
    <div className="conditions-explorer">
      {marine && (
        <SeaConditionsPanel
          data={marine}
          loading={marineLoading}
          fallbackTide={fallbackTide}
        />
      )}

      <ReservoirExplorer
        location={location}
        spotName={location.label}
        initialView={initialReservoirView}
        countyQuery={countyQuery}
      />

      <p className="conditions-explorer-note">
        날씨 예보는 <a href="/weather">낚시 날씨</a> 페이지에서 확인하세요.
      </p>
    </div>
  );
}
