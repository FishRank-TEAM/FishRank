'use client';

import type { TideInfo } from '@/lib/weather';
import type { MarineConditionsData } from '@/lib/marine-conditions';
import { dedupeTideEvents, indexLabelColor } from '@/lib/marine-conditions';

type Props = {
  data: MarineConditionsData;
  loading?: boolean;
  fallbackTide?: TideInfo | null;
};

export default function SeaConditionsPanel({ data, loading, fallbackTide }: Props) {
  const { fishing, tide } = data;
  const tideEvents = dedupeTideEvents(tide.events);

  return (
    <section className="weather-marine-panel">
      <h3 className="weather-marine-title">바다 · 물때</h3>

      <div className="weather-marine-card">
        <div className="weather-marine-card-head">
          <span>🎣 바다낚시지수</span>
          {fishing.placeName && <em>{fishing.placeName}</em>}
        </div>
        {loading && !fishing.rows.length ? (
          <p className="weather-marine-muted">불러오는 중…</p>
        ) : fishing.rows.length ? (
          <ul className="weather-marine-fish-list">
            {fishing.rows.map((row, i) => (
              <li key={`${row.fishName ?? 'fish'}-${i}`}>
                <strong>{row.fishName}</strong>
                <span
                  className="weather-marine-index"
                  style={{ color: indexLabelColor(row.fishingIndexLabel) }}
                >
                  {row.fishingIndexLabel ?? '-'}
                </span>
                {row.waterTemp != null && (
                  <span className="weather-marine-meta">수온 {row.waterTemp}°C</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="weather-marine-muted">연안 낚시지수 데이터가 없습니다.</p>
        )}
        <p className="weather-marine-source">출처: 국립해양조사원 · 갯바위</p>
      </div>

      <div className="weather-marine-card">
        <div className="weather-marine-card-head">
          <span>🌊 조석 · 물때</span>
          {tide.point?.name && <em>{tide.point.name}</em>}
        </div>
        {tideEvents.length ? (
          <div className="weather-marine-tide-grid">
            {tideEvents.map((ev, i) => (
              <div
                key={`${ev.time}-${ev.label}-${i}`}
                className={`weather-marine-tide ${ev.label === '만조' ? 'high' : 'low'}`}
              >
                <span>{ev.time}</span>
                <em>{ev.label}</em>
                <strong>{ev.levelCm}cm</strong>
              </div>
            ))}
          </div>
        ) : fallbackTide?.events.length ? (
          <>
            <p className="weather-marine-muted">
              {fallbackTide.lunarLabel} · {fallbackTide.tideStrength} (음력 근사)
            </p>
            <div className="weather-marine-tide-grid">
              {fallbackTide.events.map((ev, i) => (
                <div
                  key={`${ev.time}-${ev.type}-${i}`}
                  className={`weather-marine-tide ${ev.type === 'high' ? 'high' : 'low'}`}
                >
                  <span>{ev.time}</span>
                  <em>{ev.label}</em>
                </div>
              ))}
            </div>
          </>
        ) : tide.rows.length ? (
          <ul className="weather-marine-tide-series">
            {tide.rows.map((r, i) => (
              <li key={r.forecastAt ?? `tide-${i}`}>
                <span>{formatSeriesTime(r.forecastAt)}</span>
                <strong>{r.tideLevelCm != null ? `${Math.round(r.tideLevelCm)}cm` : '-'}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="weather-marine-muted">조석 예보를 불러올 수 없습니다.</p>
        )}
        <p className="weather-marine-source">출처: 국립해양조사원 조석예보</p>
      </div>
    </section>
  );
}

function formatSeriesTime(forecastAt: string | null): string {
  if (!forecastAt) return '-';
  const m = forecastAt.match(/(\d{2}):(\d{2})/);
  if (m) return `${m[1]}:${m[2]}`;
  if (forecastAt.length >= 16) return forecastAt.slice(11, 16);
  return forecastAt;
}
