'use client';

import { useEffect, useMemo, useState } from 'react';
import type { WeatherLocation } from '@/lib/weather';
import type { ReservoirMapItem, ReservoirSummary, ReservoirViewMode } from '@/lib/marine-conditions';
import { formatCheckDate, reservoirRateColor } from '@/lib/marine-conditions';
import { useReservoirArea } from '@/hooks/useReservoirArea';
import ReservoirMap from './ReservoirMap';
import ReservoirTable from './ReservoirTable';
import { ReservoirDetailSkeleton, ReservoirMapSkeleton, ReservoirTableSkeleton } from './ReservoirSkeleton';

type Props = {
  location: WeatherLocation;
  spotName: string | null;
  initialSelected?: ReservoirSummary | null;
  initialView?: ReservoirViewMode;
  countyQuery?: string;
};

export default function ReservoirExplorer({
  location,
  spotName,
  initialSelected,
  initialView = 'map',
  countyQuery = '',
}: Props) {
  const [view, setView] = useState<ReservoirViewMode>(initialView);
  const { area, loading, fetching } = useReservoirArea(location, true, countyQuery);

  const rows = area?.rows ?? [];
  const regionLabel = area?.spot ?? spotName;
  const showSkeleton = (loading || fetching) && !rows.length;
  const mapRows = useMemo(() => rows.filter((r) => r.geocoded === true), [rows]);

  const [selectedFacCode, setSelectedFacCode] = useState<string | null>(
    initialSelected?.facCode ?? null,
  );

  useEffect(() => {
    setSelectedFacCode(initialSelected?.facCode ?? null);
  }, [initialSelected?.facCode, location.lat, location.lng, countyQuery]);

  useEffect(() => {
    if (!selectedFacCode && rows.length) {
      const preferred = initialSelected?.facCode
        ? rows.find((r) => r.facCode === initialSelected.facCode)
        : rows[0];
      if (preferred) setSelectedFacCode(preferred.facCode);
    }
  }, [rows, initialSelected?.facCode, selectedFacCode]);

  const selected = useMemo(
    () => rows.find((r) => r.facCode === selectedFacCode) ?? null,
    [rows, selectedFacCode],
  );

  const handleSelect = (row: ReservoirMapItem) => {
    setSelectedFacCode(row.facCode);
  };

  const center = area?.center ?? { lat: location.lat, lng: location.lng };

  return (
    <div className="reservoir-explorer" id="freshwater-section">
      <div className="reservoir-explorer-head">
        <div>
          <h3 className="weather-marine-title freshwater">민물 · 저수지</h3>
          <p className="weather-marine-muted">
            {regionLabel && <>검색 기준: {regionLabel}</>}
            {area?.totalCount != null && area.totalCount > 0 && (
              <> · 전국 API 결과 {area.totalCount}곳 (지도는 위치 확인된 곳만)</>
            )}
          </p>
        </div>
        <div className="reservoir-view-toggle" role="tablist" aria-label="저수지 보기 방식">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'map'}
            className={view === 'map' ? 'active' : undefined}
            onClick={() => setView('map')}
          >
            지도
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'list'}
            className={view === 'list' ? 'active' : undefined}
            onClick={() => setView('list')}
          >
            목록
          </button>
        </div>
      </div>

      <div className="weather-marine-card freshwater reservoir-explorer-body">
        {showSkeleton ? (
          <>
            {view === 'map' ? <ReservoirMapSkeleton /> : <ReservoirTableSkeleton />}
            <ReservoirDetailSkeleton />
          </>
        ) : !rows.length ? (
          <p className="weather-marine-muted">
            {countyQuery || regionLabel || '이 지역'} 저수지 수위 데이터를 찾지 못했습니다.
            위 검색창에 시·군·구 이름(예: 구미)을 입력해 보세요.
          </p>
        ) : view === 'map' ? (
          mapRows.length ? (
            <ReservoirMap
              rows={mapRows}
              center={center}
              selectedFacCode={selectedFacCode}
              onSelect={handleSelect}
            />
          ) : (
            <p className="weather-marine-muted">
              지도에 표시할 위치 정보가 없습니다. 목록 탭을 이용해 주세요.
            </p>
          )
        ) : (
          <ReservoirTable
            rows={rows}
            selectedFacCode={selectedFacCode}
            onSelect={handleSelect}
          />
        )}

        {selected && (
          <div className="reservoir-detail-panel">
            <div className="reservoir-detail-head">
              <strong>🏞 {selected.facName}</strong>
              {selected.county && <em>{selected.county}</em>}
            </div>
            <div className="weather-marine-reservoir-stats">
              <div>
                <span>저수율</span>
                <strong style={{ color: reservoirRateColor(selected.ratePercent) }}>
                  {selected.ratePercent != null ? `${selected.ratePercent.toFixed(1)}%` : '-'}
                </strong>
              </div>
              <div>
                <span>수위</span>
                <strong>
                  {selected.waterLevelM != null ? `${selected.waterLevelM.toFixed(2)}m` : '-'}
                </strong>
              </div>
            </div>
            {selected.checkDate && (
              <p className="weather-marine-muted">기준 {formatCheckDate(selected.checkDate)}</p>
            )}
            {view === 'list' && (
              <button type="button" className="reservoir-map-jump" onClick={() => setView('map')}>
                지도에서 위치 보기 →
              </button>
            )}
          </div>
        )}

        <p className="weather-marine-source">
          출처: KRC 농촌용수 저수지 (15099919) · 전국 시·군·구 단위 조회
          {area?.searchQuery ? ` · 검색어: ${area.searchQuery}` : ''}
          {mapRows.length ? ` · 지도 ${mapRows.length}곳` : ''}
        </p>
      </div>
    </div>
  );
}
