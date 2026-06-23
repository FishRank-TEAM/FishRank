'use client';

type BlockProps = {
  className?: string;
  round?: 'sm' | 'md' | 'full';
};

function Block({ className = '', round = 'sm' }: BlockProps) {
  return <div className={`weather-skeleton-block weather-skeleton-round-${round} ${className}`.trim()} aria-hidden />;
}

export function WeatherWidgetSkeleton() {
  return (
    <div className="weather-widget weather-skeleton-wrap" aria-busy="true" aria-label="날씨 불러오는 중">
      <div className="weather-widget-top">
        <div className="weather-widget-main">
          <Block className="weather-skeleton-emoji" round="full" />
          <div className="weather-skeleton-stack">
            <Block className="weather-skeleton-temp" />
            <Block className="weather-skeleton-label" />
          </div>
        </div>
      </div>
      <Block className="weather-skeleton-condition" round="md" />
    </div>
  );
}

export function WeatherWidgetMiniSkeleton() {
  return (
    <div className="weather-mini weather-skeleton-wrap" aria-busy="true" aria-label="날씨 불러오는 중">
      <Block className="weather-skeleton-mini-emoji" round="full" />
      <div className="weather-mini-body weather-skeleton-stack">
        <Block className="weather-skeleton-mini-line" />
        <Block className="weather-skeleton-mini-line short" />
      </div>
    </div>
  );
}

export function WeatherPageSkeleton() {
  return (
    <div className="weather-explorer weather-g-layout weather-skeleton-wrap" aria-busy="true" aria-label="날씨 불러오는 중">
      <Block className="weather-skeleton-g-card" round="md" />
      <Block className="weather-skeleton-g-bar" round="md" />
      <section className="weather-g-charts">
        <div className="weather-skeleton-chart-tabs">
          {Array.from({ length: 4 }).map((_, i) => (
            <Block key={i} className="weather-skeleton-chart-tab" round="full" />
          ))}
        </div>
        <Block className="weather-skeleton-chart-area" round="md" />
      </section>
      <div className="weather-g-week">
        {Array.from({ length: 7 }).map((_, i) => (
          <Block key={i} className="weather-skeleton-week-item" round="md" />
        ))}
      </div>
      <p className="weather-skeleton-status">기상청 데이터를 불러오는 중...</p>
    </div>
  );
}
