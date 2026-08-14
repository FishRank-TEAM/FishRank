'use client';

function Block({ className = '' }: { className?: string }) {
  return <div className={`weather-skeleton-block weather-skeleton-round-sm ${className}`.trim()} aria-hidden />;
}

const BUBBLES = [
  { top: '22%', left: '28%', size: 44 },
  { top: '38%', left: '58%', size: 36 },
  { top: '55%', left: '35%', size: 40 },
  { top: '30%', left: '72%', size: 32 },
  { top: '62%', left: '68%', size: 38 },
];

export function ReservoirMapSkeleton() {
  return (
    <div className="reservoir-skeleton-map" aria-busy="true" aria-label="저수지 지도 불러오는 중">
      <div className="reservoir-skeleton-map-canvas">
        {BUBBLES.map((b, i) => (
          <div
            key={i}
            className="weather-skeleton-block reservoir-skeleton-bubble"
            style={{ top: b.top, left: b.left, width: b.size, height: b.size }}
            aria-hidden
          />
        ))}
      </div>
      <div className="reservoir-skeleton-legend">
        <Block className="reservoir-skeleton-legend-item" />
        <Block className="reservoir-skeleton-legend-item" />
        <Block className="reservoir-skeleton-legend-item" />
      </div>
    </div>
  );
}

export function ReservoirTableSkeleton() {
  return (
    <div className="reservoir-skeleton-table" aria-busy="true" aria-label="저수지 목록 불러오는 중">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="reservoir-skeleton-table-row">
          <Block className="reservoir-skeleton-cell wide" />
          <Block className="reservoir-skeleton-cell" />
          <Block className="reservoir-skeleton-cell short" />
        </div>
      ))}
    </div>
  );
}

export function ReservoirDetailSkeleton() {
  return (
    <div className="reservoir-detail-panel reservoir-skeleton-detail" aria-hidden>
      <Block className="reservoir-skeleton-detail-title" />
      <div className="reservoir-skeleton-detail-stats">
        <Block className="reservoir-skeleton-stat" />
        <Block className="reservoir-skeleton-stat" />
      </div>
    </div>
  );
}
