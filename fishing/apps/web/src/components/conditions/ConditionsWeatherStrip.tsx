'use client';

import Link from 'next/link';
import { fishingStars, skyEmoji } from '@/lib/weather';
import type { WeatherLocation } from '@/lib/weather';
import { useWeather } from '@/hooks/useWeather';

type Props = {
  location: WeatherLocation;
};

/** 출조 페이지용 오늘 기상 한 줄 요약 */
export default function ConditionsWeatherStrip({ location }: Props) {
  const { weather, loading, error } = useWeather(location);

  if (error) {
    return (
      <div className="conditions-weather-strip muted">
        <span>기상 요약을 불러오지 못했습니다.</span>
        <Link href="/weather">날씨 상세 →</Link>
      </div>
    );
  }

  if (loading || !weather) {
    return (
      <div className="conditions-weather-strip muted" aria-busy="true">
        기상 요약 불러오는 중…
      </div>
    );
  }

  const { current, fishingCondition } = weather;
  const emoji = skyEmoji(current.sky, current.precipitationType);

  return (
    <div className="conditions-weather-strip">
      <div className="conditions-weather-strip-main">
        <span className="conditions-weather-emoji" aria-hidden>{emoji}</span>
        <strong>{current.temp}°C · {current.skyLabel}</strong>
        <span
          className="conditions-weather-score"
          style={{ color: fishingCondition.color }}
        >
          {fishingStars(fishingCondition.score)} {fishingCondition.label}
        </span>
      </div>
      <Link href="/weather" className="conditions-weather-link">
        예보 상세 →
      </Link>
    </div>
  );
}
