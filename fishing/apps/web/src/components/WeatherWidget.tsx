'use client';

import Link from 'next/link';
import { useWeather, useWeatherLocation } from '@/hooks/useWeather';
import { fishingStars, skyEmoji } from '@/lib/weather';
import type { WeatherLocation } from '@/lib/weather';
import { WeatherWidgetMiniSkeleton, WeatherWidgetSkeleton } from '@/components/weather/WeatherSkeleton';

type Props = {
  compact?: boolean;
  showDetailLink?: boolean;
  location?: WeatherLocation;
  weather?: import('@/lib/weather').WeatherData | null;
  loading?: boolean;
  error?: string;
};

export default function WeatherWidget({
  compact = false,
  showDetailLink = true,
  location: locationProp,
  weather: weatherProp,
  loading: loadingProp,
  error: errorProp,
}: Props) {
  const internal = useWeatherLocation();
  const location = locationProp ?? internal.location;
  const shouldFetch = weatherProp === undefined;
  const fetched = useWeather(location, shouldFetch);
  const weather = weatherProp !== undefined ? weatherProp : fetched.weather;
  const loading = loadingProp ?? (shouldFetch && fetched.loading);
  const error = errorProp ?? (shouldFetch ? fetched.error : '');

  if (error) {
    return (
      <div className="weather-widget weather-widget-error">
        <p className="weather-widget-loading">{error}</p>
        {error.includes('KMA_SERVICE_KEY') && (
          <p className="weather-widget-hint">기상청 API허브에서 인증키 발급 후 api/.env에 설정하세요.</p>
        )}
      </div>
    );
  }

  if (loading || !weather) {
    if (compact) return <WeatherWidgetMiniSkeleton />;
    return <WeatherWidgetSkeleton />;
  }

  const { current, fishingCondition } = weather;
  const emoji = skyEmoji(current.sky, current.precipitationType);

  if (compact) {
    return (
      <Link href="/weather" className="weather-mini-link">
        <div className="weather-mini">
          <span className="weather-mini-emoji">{emoji}</span>
          <div className="weather-mini-body">
            <div className="weather-mini-temp">{current.temp}°C · {current.skyLabel}</div>
            <div className="weather-mini-meta">
              💨 {current.windSpeed.toFixed(1)}m/s ({current.windDirectionLabel})
              · {fishingCondition.label}
            </div>
          </div>
          <span className="weather-mini-arrow">→</span>
        </div>
      </Link>
    );
  }

  return (
    <div className="weather-widget">
      <div className="weather-widget-top">
        <div className="weather-widget-main">
          <span className="weather-widget-emoji">{emoji}</span>
          <div>
            <div className="weather-widget-temp">{current.temp}°C</div>
            <div className="weather-widget-label">{current.skyLabel}</div>
          </div>
        </div>
        <div className="weather-widget-stats">
          <div>💨 {current.windSpeed.toFixed(1)}m/s</div>
          <div>🧭 {current.windDirectionLabel}</div>
          <div>💧 {current.humidity}%</div>
          <div>🌧 {current.precipitation}mm</div>
        </div>
      </div>
      <div className="weather-widget-condition" style={{ background: `${fishingCondition.color}20` }}>
        <span className="weather-widget-dot" style={{ background: fishingCondition.color }} />
        <span className="weather-widget-condition-label" style={{ color: fishingCondition.color }}>
          {fishingCondition.label}
        </span>
        <span className="weather-widget-condition-desc">— {fishingCondition.desc}</span>
      </div>
      <div className="weather-widget-source">출처: 기상청 · {fishingStars(fishingCondition.score)}</div>
      {showDetailLink && (
        <Link href="/weather" className="weather-widget-detail-link">
          시간별 예보 보기 →
        </Link>
      )}
    </div>
  );
}
