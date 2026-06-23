'use client';

import PageHeader from '@/components/layout/PageHeader';
import WeatherExplorer from '@/components/weather/WeatherExplorer';
import WeatherLocationBar from '@/components/weather/WeatherLocationBar';
import { WeatherPageSkeleton } from '@/components/weather/WeatherSkeleton';
import { useWeather, useWeatherLocation } from '@/hooks/useWeather';

export default function WeatherPage() {
  const { location, setLocation, requestGps, gpsLoading, gpsError } = useWeatherLocation();
  const { weather, loading, fetching, error } = useWeather(location);

  return (
    <main>
      <PageHeader
        title="낚시 날씨"
        description="출조 판단 · 시간별 예보 · 물때"
      />

      <div className="site-container site-page-body weather-page">
        <WeatherLocationBar
          location={location}
          onLocationChange={setLocation}
          onGpsRequest={requestGps}
          gpsLoading={gpsLoading}
          gpsError={gpsError}
        />

        {error && (
          <div className="weather-page-error">
            <h3>날씨 API 설정 필요</h3>
            <ol>
              <li>
                <a href="https://apihub.kma.go.kr" target="_blank" rel="noreferrer">
                  기상청 API허브
                </a>
                에서 동네예보(초단기실황·초단기예보·단기예보) 활용 신청
              </li>
              <li>인증키를 <code>apps/api/.env</code>의 <code>KMA_SERVICE_KEY</code>에 입력</li>
              <li>API 서버 재시작</li>
            </ol>
          </div>
        )}

        {loading && !weather && !error && <WeatherPageSkeleton />}

        {!error && weather && (
          <>
            {fetching && !loading && (
              <p className="weather-refresh-hint" aria-live="polite">날씨 갱신 중…</p>
            )}
            {!weather.forecastAvailable && weather.forecastNotice && (
              <div className="info-callout" style={{ marginBottom: 16 }}>
                {weather.forecastNotice}
              </div>
            )}
            <WeatherExplorer weather={weather} />
          </>
        )}
      </div>
    </main>
  );
}
