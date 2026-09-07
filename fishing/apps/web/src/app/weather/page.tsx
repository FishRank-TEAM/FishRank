'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import WeatherExplorer from '@/components/weather/WeatherExplorer';
import WeatherLocationBar from '@/components/weather/WeatherLocationBar';
import { WeatherPageSkeleton } from '@/components/weather/WeatherSkeleton';
import { useWeather, useWeatherLocation } from '@/hooks/useWeather';

export default function WeatherPage() {
  return (
    <Suspense fallback={<WeatherPageSkeleton />}>
      <WeatherPageContent />
    </Suspense>
  );
}

function WeatherPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { location, setLocation, requestGps, gpsLoading, gpsError } = useWeatherLocation();
  const { weather, loading, fetching, error } = useWeather(location);

  // 예전 딥링크(물때·저수지) → 출조 페이지로 이전
  useEffect(() => {
    const section = searchParams.get('section');
    const fresh = searchParams.get('fresh');
    const q = searchParams.get('q');
    if (section === 'reservoir' || fresh === '1') {
      const params = new URLSearchParams({ layers: 'reservoir,fresh,sea' });
      if (q) params.set('q', q);
      router.replace(`/conditions?${params.toString()}`);
      return;
    }
    if (section === 'tide') {
      router.replace('/conditions?layers=sea');
    }
  }, [searchParams, router]);

  return (
    <main>
      <PageHeader
        title="낚시 날씨"
        description="기온 · 바람 · 강수 · 출조 판정"
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
          <div className="weather-page-error" role="alert">
            <h3>날씨 정보를 불러오지 못했습니다</h3>
            <p>잠시 후 다시 시도해 주세요. 문제가 계속되면 다른 지역을 검색해 보세요.</p>
            <button
              type="button"
              className="county-search-btn"
              onClick={() => window.location.reload()}
            >
              다시 시도
            </button>
            {process.env.NODE_ENV === 'development' && (
              <details className="weather-page-error-dev">
                <summary>개발자 안내</summary>
                <ol>
                  <li>
                    <a href="https://apihub.kma.go.kr" target="_blank" rel="noreferrer">
                      기상청 API허브
                    </a>
                    에서 동네예보 활용 신청
                  </li>
                  <li>
                    인증키를 <code>apps/api/.env</code>의 <code>KMA_SERVICE_KEY</code>에 입력
                  </li>
                  <li>API 서버 재시작</li>
                </ol>
                {error && <p className="weather-page-error-detail">{error}</p>}
              </details>
            )}
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
            <WeatherExplorer weather={weather} location={location} />
          </>
        )}

        {!error && (
          <aside className="weather-conditions-cta">
            <div>
              <strong>물때 · 낚시지수 · 저수지 수위</strong>
              <p>포인트별 출조 조건은 출조 페이지에서 확인하세요.</p>
            </div>
            <Link href="/conditions" className="county-search-btn">
              출조 보기 →
            </Link>
          </aside>
        )}
      </div>
    </main>
  );
}
