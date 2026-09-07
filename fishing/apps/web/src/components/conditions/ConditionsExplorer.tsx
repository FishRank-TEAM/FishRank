'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { WeatherLocation } from '@/lib/weather';
import type { SeaFishingGubun } from '@/lib/marine-conditions';
import { useMarineConditions } from '@/hooks/useMarineConditions';
import { useWeather } from '@/hooks/useWeather';
import SeaConditionsPanel from './SeaConditionsPanel';

type Props = {
  location: WeatherLocation;
  gubun?: SeaFishingGubun;
  onGubunChange?: (gubun: SeaFishingGubun) => void;
};

/** 지도에서 고른 위치의 바다낚시지수·물때 상세 */
export default function ConditionsExplorer({
  location,
  gubun = '갯바위',
  onGubunChange,
}: Props) {
  const [localGubun, setLocalGubun] = useState<SeaFishingGubun>(gubun);
  const activeGubun = onGubunChange ? gubun : localGubun;
  const handleGubun = onGubunChange ?? setLocalGubun;

  const { marine, loading: marineLoading } = useMarineConditions(location, true, activeGubun);
  const { weather } = useWeather(location, true);

  const fallbackTide = useMemo(
    () => weather?.days[0]?.tide ?? null,
    [weather?.days],
  );

  return (
    <div className="conditions-explorer">
      <h3 className="weather-marine-title">바다 · 낚시지수 · 물때</h3>
      <p className="weather-marine-muted" style={{ marginBottom: 12 }}>
        선택 위치(<strong>{location.label}</strong>) 기준 연안 정보입니다.
      </p>

      {marine ? (
        <SeaConditionsPanel
          data={marine}
          loading={marineLoading}
          fallbackTide={fallbackTide}
          gubun={activeGubun}
          onGubunChange={handleGubun}
        />
      ) : (
        <p className="weather-marine-muted" style={{ marginTop: 8 }}>
          {marineLoading ? '바다·물때 정보를 불러오는 중…' : '바다·물때 정보를 불러오지 못했습니다.'}
        </p>
      )}

      <p className="conditions-explorer-note">
        기온·바람·출조 판정은 <Link href="/weather">낚시 날씨</Link>에서 확인하세요.
      </p>
    </div>
  );
}
