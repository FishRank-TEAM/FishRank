'use client';

import { useMemo, useState } from 'react';
import type { TideInfo } from '@/lib/weather';
import type { MarineConditionsData, SeaFishingGubun } from '@/lib/marine-conditions';
import {
  dedupeTideEvents,
  findNextTideEvent,
  indexLabelColor,
  pickPrimaryFish,
} from '@/lib/marine-conditions';

type Props = {
  data: MarineConditionsData;
  loading?: boolean;
  fallbackTide?: TideInfo | null;
  gubun?: SeaFishingGubun;
  onGubunChange?: (gubun: SeaFishingGubun) => void;
};

export default function SeaConditionsPanel({
  data,
  loading,
  fallbackTide,
  gubun = '갯바위',
  onGubunChange,
}: Props) {
  const { fishing, tide } = data;
  const tideEvents = dedupeTideEvents(tide.events);
  const primary = pickPrimaryFish(fishing.rows);
  const nextTide = useMemo(() => findNextTideEvent(tideEvents), [tideEvents]);
  const [fishOpen, setFishOpen] = useState(true);

  const fallbackEvents = fallbackTide?.events ?? [];
  const previewRows = fishing.rows.slice(0, 2);

  return (
    <section className="weather-marine-panel conditions-sea-panel">
      <div className="conditions-today-summary">
        <p className="conditions-today-kicker">오늘 한눈에</p>
        {loading && !primary && !tideEvents.length ? (
          <p className="weather-marine-muted">불러오는 중…</p>
        ) : (
          <div className="conditions-today-grid">
            <div className="conditions-today-item">
              <span>바다낚시지수</span>
              {primary ? (
                <strong style={{ color: indexLabelColor(primary.fishingIndexLabel) }}>
                  {primary.fishName ?? '어종'} · {primary.fishingIndexLabel ?? '-'}
                </strong>
              ) : (
                <strong className="muted">데이터 없음</strong>
              )}
              {primary?.waterTemp != null && (
                <em>수온 {primary.waterTemp}°C</em>
              )}
              {fishing.placeName && <em>{fishing.placeName}</em>}
            </div>
            <div className="conditions-today-item">
              <span>다음 물때</span>
              {nextTide ? (
                <strong className={nextTide.label === '만조' ? 'high' : 'low'}>
                  {nextTide.label} {nextTide.time}
                </strong>
              ) : fallbackTide ? (
                <strong>
                  {fallbackTide.lunarLabel} · {fallbackTide.tideStrength}
                </strong>
              ) : (
                <strong className="muted">예보 없음</strong>
              )}
              {nextTide && <em>{nextTide.levelCm}cm · {tide.point?.name || '관측소'}</em>}
            </div>
          </div>
        )}
      </div>

      {onGubunChange && (
        <div className="reservoir-view-toggle conditions-gubun-toggle" role="tablist" aria-label="낚시 유형">
          {(['갯바위', '선상'] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={gubun === key}
              className={gubun === key ? 'active' : undefined}
              onClick={() => onGubunChange(key)}
            >
              {key}
            </button>
          ))}
        </div>
      )}

      <div className="weather-marine-card">
        <button
          type="button"
          className="weather-marine-card-head conditions-card-toggle"
          onClick={() => setFishOpen((v) => !v)}
          aria-expanded={fishOpen}
        >
          <span>바다낚시지수 {fishing.rows.length ? `(${fishing.rows.length})` : ''}</span>
          <em>{fishOpen ? '접기' : '펼치기'}</em>
        </button>

        {!fishOpen && previewRows.length > 0 && (
          <ul className="weather-marine-fish-list weather-marine-fish-preview">
            {previewRows.map((row, i) => (
              <li key={`${row.fishName ?? 'fish'}-preview-${i}`}>
                <strong>{row.fishName}</strong>
                <span
                  className="weather-marine-index"
                  style={{ color: indexLabelColor(row.fishingIndexLabel) }}
                >
                  {row.fishingIndexLabel ?? '-'}
                </span>
              </li>
            ))}
          </ul>
        )}

        {fishOpen && (
          <>
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
            <p className="weather-marine-source">출처: 국립해양조사원 · {gubun}</p>
          </>
        )}
      </div>

      <div className="weather-marine-card">
        <div className="weather-marine-card-head">
          <span>조석 · 물때</span>
          {tide.point?.name && <em>{tide.point.name}</em>}
        </div>
        {tideEvents.length ? (
          <ol className="conditions-tide-timeline">
            {tideEvents.map((ev, i) => {
              const isNext = nextTide?.time === ev.time && nextTide?.label === ev.label;
              return (
                <li
                  key={`${ev.time}-${ev.label}-${i}`}
                  className={`conditions-tide-step ${ev.label === '만조' ? 'high' : 'low'}${isNext ? ' next' : ''}`}
                >
                  <span className="conditions-tide-dot" aria-hidden />
                  <div>
                    <strong>
                      {ev.label} {ev.time}
                      {isNext && <em className="conditions-tide-badge">다음</em>}
                    </strong>
                    <span>{ev.levelCm}cm</span>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : fallbackEvents.length ? (
          <>
            <p className="weather-marine-muted">
              {fallbackTide?.lunarLabel} · {fallbackTide?.tideStrength} (음력 근사)
            </p>
            <div className="weather-marine-tide-grid">
              {fallbackEvents.map((ev, i) => (
                <div
                  key={`${ev.time}-${ev.type}-${i}`}
                  className={`weather-marine-tide ${ev.type === 'high' ? 'high' : 'low'}`}
                >
                  <span>{ev.time}</span>
                  <em>{ev.type === 'high' ? '만조' : '간조'}</em>
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
