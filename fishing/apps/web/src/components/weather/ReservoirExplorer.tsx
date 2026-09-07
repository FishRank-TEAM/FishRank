'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { PlaceResult, WeatherLocation } from '@/lib/weather';
import type { ReservoirMapItem, ReservoirSummary, ReservoirViewMode } from '@/lib/marine-conditions';
import { formatCheckDate, reservoirRateColor } from '@/lib/marine-conditions';
import { useReservoirArea } from '@/hooks/useReservoirArea';
import ReservoirMap from './ReservoirMap';
import ReservoirTable from './ReservoirTable';
import CountySearchBar from '@/components/conditions/CountySearchBar';
import { ReservoirDetailSkeleton, ReservoirMapSkeleton, ReservoirTableSkeleton } from './ReservoirSkeleton';

type Props = {
  location: WeatherLocation;
  spotName: string | null;
  initialSelected?: ReservoirSummary | null;
  initialView?: ReservoirViewMode;
  countyQuery?: string;
  onCountyQueryChange?: (q: string) => void;
  onViewChange?: (view: ReservoirViewMode) => void;
  embedSearch?: boolean;
};

export default function ReservoirExplorer({
  location,
  spotName,
  initialSelected,
  initialView = 'map',
  countyQuery = '',
  onCountyQueryChange,
  onViewChange,
  embedSearch = false,
}: Props) {
  const [view, setView] = useState<ReservoirViewMode>(initialView);
  const [localQuery, setLocalQuery] = useState(countyQuery);
  const appliedQuery = onCountyQueryChange ? countyQuery : localQuery;
  const { area, loading, fetching } = useReservoirArea(location, true, appliedQuery);

  const { data: presets = [] } = useQuery({
    queryKey: ['weather-presets'],
    queryFn: async () => {
      const res = await api.get('/weather/presets');
      return res.data.data as PlaceResult[];
    },
    staleTime: 24 * 60 * 60 * 1000,
  });

  const nearbySpots = useMemo(() => {
    const center = area?.center ?? { lat: location.lat, lng: location.lng };
    return presets
      .filter((p) => p.spotType === 'fresh' || p.spotType === 'mixed')
      .filter((p) => {
        const dlat = Math.abs(p.lat - center.lat);
        const dlng = Math.abs(p.lng - center.lng);
        return dlat < 1.2 && dlng < 1.2;
      })
      .slice(0, 8);
  }, [presets, area?.center, location.lat, location.lng]);

  const rows = area?.rows ?? [];
  const regionLabel = area?.spot ?? spotName;
  const showSkeleton = (loading || fetching) && !rows.length;
  const mapRows = useMemo(() => rows.filter((r) => r.geocoded === true), [rows]);
  const withLevel = useMemo(() => rows.filter((r) => r.ratePercent != null).length, [rows]);

  const [selectedFacCode, setSelectedFacCode] = useState<string | null>(
    initialSelected?.facCode ?? null,
  );
  const [levelPatch, setLevelPatch] = useState<Partial<ReservoirMapItem> | null>(null);

  useEffect(() => {
    setLocalQuery(countyQuery);
  }, [countyQuery]);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  const changeView = (next: ReservoirViewMode) => {
    setView(next);
    onViewChange?.(next);
  };

  useEffect(() => {
    setSelectedFacCode(initialSelected?.facCode ?? null);
    setLevelPatch(null);
  }, [initialSelected?.facCode, location.lat, location.lng, appliedQuery]);

  useEffect(() => {
    if (!selectedFacCode && rows.length) {
      const preferred = initialSelected?.facCode
        ? rows.find((r) => r.facCode === initialSelected.facCode)
        : mapRows[0] ?? rows[0];
      if (preferred) setSelectedFacCode(preferred.facCode);
    }
  }, [rows, mapRows, initialSelected?.facCode, selectedFacCode]);

  const selectedBase = useMemo(
    () => rows.find((r) => r.facCode === selectedFacCode) ?? null,
    [rows, selectedFacCode],
  );

  const selected = useMemo(() => {
    if (!selectedBase) return null;
    if (levelPatch && levelPatch.facCode === selectedBase.facCode) {
      return { ...selectedBase, ...levelPatch };
    }
    return selectedBase;
  }, [selectedBase, levelPatch]);

  // 선택 저수지에 수위가 없으면 개별 조회
  useEffect(() => {
    if (!selectedBase || selectedBase.ratePercent != null) return;
    let cancelled = false;
    api
      .get(`/weather/reservoirs/${selectedBase.facCode}/levels`)
      .then((res) => {
        if (cancelled) return;
        const latest = res.data?.data?.latest;
        if (!latest) return;
        setLevelPatch({
          facCode: selectedBase.facCode,
          ratePercent: latest.ratePercent ?? null,
          waterLevelM: latest.waterLevelM ?? null,
          checkDate: latest.checkDate ?? null,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedBase?.facCode, selectedBase?.ratePercent]);

  const handleSelect = (row: ReservoirMapItem) => {
    setSelectedFacCode(row.facCode);
    setLevelPatch(null);
  };

  const handleSelectFromList = (row: ReservoirMapItem) => {
    setSelectedFacCode(row.facCode);
    setLevelPatch(null);
    if (row.geocoded) changeView('map');
  };

  const handleCountyApply = (q: string) => {
    if (onCountyQueryChange) onCountyQueryChange(q);
    else setLocalQuery(q);
  };

  const center = area?.center ?? { lat: location.lat, lng: location.lng };
  const searchLabel = appliedQuery || regionLabel || '이 지역';

  return (
    <div className="reservoir-explorer reservoir-explorer--mapfirst" id="freshwater-section">
      <div className="reservoir-explorer-head">
        <div>
          <h3 className="weather-marine-title freshwater">민물 · 저수지 지도</h3>
          <p className="weather-marine-muted">
            {regionLabel && <>{regionLabel}</>}
            {area?.totalCount != null && area.totalCount > 0 && (
              <>
                {' '}· 저수지 {area.totalCount}곳
                {withLevel > 0 && <> · 수위 {withLevel}</>}
                {mapRows.length > 0 && <> · 지도 {mapRows.length}</>}
              </>
            )}
          </p>
        </div>
        <div className="reservoir-view-toggle" role="tablist" aria-label="저수지 보기 방식">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'map'}
            className={view === 'map' ? 'active' : undefined}
            onClick={() => changeView('map')}
          >
            지도
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'list'}
            className={view === 'list' ? 'active' : undefined}
            onClick={() => changeView('list')}
          >
            목록
          </button>
        </div>
      </div>

      {embedSearch && (
        <CountySearchBar
          value={appliedQuery}
          onApply={handleCountyApply}
          regionHint={location.label}
          compact
        />
      )}

      <div className="weather-marine-card freshwater reservoir-explorer-body">
        {showSkeleton ? (
          <>
            {view === 'map' ? <ReservoirMapSkeleton /> : <ReservoirTableSkeleton />}
            <ReservoirDetailSkeleton />
          </>
        ) : !rows.length ? (
          <div className="conditions-empty">
            <p className="weather-marine-muted">
              <strong>{searchLabel}</strong>에서 저수지 데이터를 찾지 못했습니다.
            </p>
            <p className="weather-marine-muted">다른 시·군·구를 검색해 보세요.</p>
          </div>
        ) : view === 'map' ? (
          mapRows.length ? (
            <ReservoirMap
              rows={mapRows.map((r) =>
                selected && r.facCode === selected.facCode ? selected : r,
              )}
              center={center}
              selectedFacCode={selectedFacCode}
              onSelect={handleSelect}
              fishingSpots={nearbySpots}
            />
          ) : (
            <div className="conditions-empty">
              <p className="weather-marine-muted">
                지도 좌표가 있는 저수지가 없습니다. 목록에서 확인해 주세요.
              </p>
              <button
                type="button"
                className="county-search-btn"
                onClick={() => changeView('list')}
              >
                목록 보기 ({rows.length}곳)
              </button>
            </div>
          )
        ) : (
          <ReservoirTable
            rows={rows}
            selectedFacCode={selectedFacCode}
            onSelect={handleSelectFromList}
          />
        )}

        {selected && (
          <div className="reservoir-detail-panel">
            <div className="reservoir-detail-head">
              <strong>{selected.facName}</strong>
              {selected.county && <em>{selected.county}</em>}
            </div>

            <div className="reservoir-rate-block">
              <div className="reservoir-rate-labels">
                <span>저수율</span>
                <strong style={{ color: reservoirRateColor(selected.ratePercent) }}>
                  {selected.ratePercent != null ? `${selected.ratePercent.toFixed(1)}%` : '확인 중…'}
                </strong>
              </div>
              <div
                className="reservoir-rate-gauge"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={selected.ratePercent ?? undefined}
                aria-label="저수율"
              >
                <div
                  className="reservoir-rate-gauge-fill"
                  style={{
                    width: `${Math.max(0, Math.min(100, selected.ratePercent ?? 0))}%`,
                    background: reservoirRateColor(selected.ratePercent),
                  }}
                />
              </div>
            </div>

            <div className="weather-marine-reservoir-stats">
              <div>
                <span>수위</span>
                <strong>
                  {selected.waterLevelM != null ? `${selected.waterLevelM.toFixed(2)}m` : '-'}
                </strong>
              </div>
              <div>
                <span>기준일</span>
                <strong className="reservoir-check-date">
                  {selected.checkDate ? formatCheckDate(selected.checkDate) : '-'}
                </strong>
              </div>
            </div>

            {view === 'list' && selected.geocoded && (
              <button type="button" className="reservoir-map-jump" onClick={() => changeView('map')}>
                지도에서 위치 보기 →
              </button>
            )}
          </div>
        )}

        <p className="weather-marine-source">
          출처: KRC 저수지 수위 · 금어는 공개 지정구역 기반
          {area?.searchQuery ? ` · ${area.searchQuery}` : ''}
        </p>
      </div>
    </div>
  );
}
