'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { PlaceResult, WeatherLocation } from '@/lib/weather';
import type { ReservoirMapItem } from '@/lib/marine-conditions';
import {
  formatCheckDate,
  reservoirBubbleSize,
  reservoirRateColor,
} from '@/lib/marine-conditions';
import { banZonesNear as localBanFallback } from '@/lib/fishing-ban-zones';
import { getKakaoMapKeyMissing, isKakaoMapReady, preloadKakaoMap } from '@/lib/kakao-map-loader';
import { useReservoirArea } from '@/hooks/useReservoirArea';
import { useFishingBans, type FishingBanZone } from '@/hooks/useFishingBans';
import CountySearchBar from '@/components/conditions/CountySearchBar';

export type MapLayerKey = 'sea' | 'fresh' | 'reservoir' | 'ban';

type Props = {
  location: WeatherLocation;
  onLocationChange: (loc: WeatherLocation, meta?: { source: 'spot' | 'reservoir' | 'map' }) => void;
  countyQuery?: string;
  onCountyQueryChange?: (q: string) => void;
  layers?: Partial<Record<MapLayerKey, boolean>>;
  onLayersChange?: (layers: Record<MapLayerKey, boolean>) => void;
};

const DEFAULT_LAYERS: Record<MapLayerKey, boolean> = {
  sea: true,
  fresh: true,
  reservoir: true,
  ban: true,
};

function shortName(name: string): string {
  const cleaned = name.replace(/\(.*?\)/g, '').trim();
  // 저수지·댐 표기를 유지해 건물과 구분
  if (cleaned.length <= 9) return cleaned;
  return cleaned.slice(0, 9);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function spotPinHtml(name: string, active: boolean, spotType?: string): string {
  const kind = spotType === 'fresh' || spotType === 'mixed' ? spotType : 'sea';
  return `<div class="cmap-spot-pin ${kind}${active ? ' active' : ''}"><i></i><span>${escapeHtml(shortName(name))}</span></div>`;
}

function bubbleHtml(row: ReservoirMapItem, selected: boolean): string {
  const color = reservoirRateColor(row.ratePercent);
  const size = Math.max(reservoirBubbleSize(row.ratePercent), 34);
  const rateLabel = row.ratePercent != null ? `${Math.round(row.ratePercent)}%` : '·';
  const ring = selected
    ? 'box-shadow:0 0 0 3px #fff,0 0 0 6px #0A2540;'
    : 'box-shadow:0 2px 8px rgba(0,0,0,.28);';
  return `
    <div class="rmap-marker" style="${ring}">
      <div class="rmap-marker-bubble" style="width:${size}px;height:${size}px;background:${color}">
        <strong>${rateLabel}</strong>
      </div>
      <span class="rmap-marker-name">${escapeHtml(shortName(row.facName))}</span>
    </div>
  `;
}

function banLabelHtml(zone: FishingBanZone): string {
  const kindLabel =
    zone.kind === 'prohibit' ? '금지' : zone.kind === 'protect' ? '보호' : '제한';
  return `<div class="rmap-ban-label">${kindLabel} · ${escapeHtml(zone.name)}</div>`;
}

function hereMarkerHtml(): string {
  return `<div class="cmap-here-pin" title="선택 위치"><i></i></div>`;
}

export default function ConditionsMapHub({
  location,
  onLocationChange,
  countyQuery = '',
  onCountyQueryChange,
  layers: layersProp,
  onLayersChange,
}: Props) {
  const [localLayers, setLocalLayers] = useState(DEFAULT_LAYERS);
  const activeLayers = layersProp
    ? { ...DEFAULT_LAYERS, ...layersProp }
    : localLayers;

  const setLayer = (key: MapLayerKey, on: boolean) => {
    const next = { ...activeLayers, [key]: on };
    if (onLayersChange) onLayersChange(next);
    else setLocalLayers(next);
  };

  const [mapCenter, setMapCenter] = useState({ lat: location.lat, lng: location.lng });
  /** 저수지·금어 API용 — 지도 드래그마다 즉시 호출하지 않음 */
  const [queryCenter, setQueryCenter] = useState({ lat: location.lat, lng: location.lng });
  const [selectedFacCode, setSelectedFacCode] = useState<string | null>(null);
  const [levelPatch, setLevelPatch] = useState<Partial<ReservoirMapItem> | null>(null);
  const [localCounty, setLocalCounty] = useState(countyQuery);
  const appliedCounty = onCountyQueryChange ? countyQuery : localCounty;

  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<kakao.maps.Map | null>(null);
  const overlays = useRef<kakao.maps.CustomOverlay[]>([]);
  const circles = useRef<unknown[]>([]);
  const skipNextPan = useRef(false);
  const stableReservoirRows = useRef<ReservoirMapItem[]>([]);

  const { data: presets = [] } = useQuery({
    queryKey: ['weather-presets'],
    queryFn: async () => {
      const res = await api.get('/weather/presets');
      return res.data.data as PlaceResult[];
    },
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { area, loading: reservoirLoading, fetching: reservoirFetching } = useReservoirArea(
    { lat: queryCenter.lat, lng: queryCenter.lng, label: location.label },
    activeLayers.reservoir,
    appliedCounty,
  );

  const reservoirRows = useMemo(() => {
    const next = (area?.rows ?? []).filter(
      (r) => r.geocoded === true && Number.isFinite(r.lat) && Number.isFinite(r.lng) && (r.lat !== 0 || r.lng !== 0),
    );
    // 새 결과가 비어 있고 아직 불러오는 중이면 이전 마커 유지
    if (next.length === 0 && reservoirFetching && stableReservoirRows.current.length > 0) {
      return stableReservoirRows.current;
    }
    if (next.length > 0) {
      stableReservoirRows.current = next;
    }
    return next;
  }, [area?.rows, reservoirFetching]);

  const seaSpots = useMemo(
    () => presets.filter((p) => p.spotType === 'sea' || p.spotType === 'mixed'),
    [presets],
  );
  const freshSpots = useMemo(
    () => presets.filter((p) => p.spotType === 'fresh' || p.spotType === 'mixed'),
    [presets],
  );

  const {
    zones: apiBans,
    disclaimer: banDisclaimer,
    loading: banLoading,
    fetching: banFetching,
  } = useFishingBans(queryCenter, activeLayers.ban, 120);

  const nearbyBans = useMemo(() => {
    if (apiBans.length) return apiBans;
    return localBanFallback(queryCenter, 120).map((z) => ({
      ...z,
      kind: 'restrict' as const,
      source: '로컬 폴백',
    }));
  }, [apiBans, queryCenter.lat, queryCenter.lng]);

  const selectedBase = useMemo(
    () => (area?.rows ?? []).find((r) => r.facCode === selectedFacCode) ?? null,
    [area?.rows, selectedFacCode],
  );

  const selectedReservoir = useMemo(() => {
    if (!selectedBase) return null;
    if (levelPatch && levelPatch.facCode === selectedBase.facCode) {
      return { ...selectedBase, ...levelPatch };
    }
    return selectedBase;
  }, [selectedBase, levelPatch]);

  useEffect(() => {
    setLocalCounty(countyQuery);
  }, [countyQuery]);

  useEffect(() => {
    setMapCenter({ lat: location.lat, lng: location.lng });
    setQueryCenter({ lat: location.lat, lng: location.lng });
    stableReservoirRows.current = [];
  }, [location.lat, location.lng]);

  // 지도 드래그 후 충분히 멈췄을 때만 저수지·금어 재조회 (약 2km 이상 이동 시)
  useEffect(() => {
    const t = window.setTimeout(() => {
      const dlat = Math.abs(queryCenter.lat - mapCenter.lat);
      const dlng = Math.abs(queryCenter.lng - mapCenter.lng);
      if (dlat >= 0.018 || dlng >= 0.018) {
        setQueryCenter({ lat: mapCenter.lat, lng: mapCenter.lng });
      }
    }, 650);
    return () => window.clearTimeout(t);
  }, [mapCenter.lat, mapCenter.lng, queryCenter.lat, queryCenter.lng]);

  useEffect(() => {
    if (!selectedBase || selectedBase.ratePercent != null) return;
    // 카카오 보강 마커는 KRC 코드가 없어 수위 API 생략
    if (String(selectedBase.facCode).startsWith('kakao-')) return;
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
    return () => { cancelled = true; };
  }, [selectedBase?.facCode, selectedBase?.ratePercent]);

  const selectSpot = useCallback((spot: PlaceResult) => {
    skipNextPan.current = true;
    setSelectedFacCode(null);
    setLevelPatch(null);
    onLocationChange(
      { lat: spot.lat, lng: spot.lng, label: spot.name },
      { source: 'spot' },
    );
  }, [onLocationChange]);

  const selectReservoir = useCallback((row: ReservoirMapItem) => {
    skipNextPan.current = true;
    setSelectedFacCode(row.facCode);
    setLevelPatch(null);
    onLocationChange(
      { lat: row.lat, lng: row.lng, label: row.facName },
      { source: 'reservoir' },
    );
  }, [onLocationChange]);

  const selectSpotRef = useRef(selectSpot);
  const selectReservoirRef = useRef(selectReservoir);
  const onLocationChangeRef = useRef(onLocationChange);
  selectSpotRef.current = selectSpot;
  selectReservoirRef.current = selectReservoir;
  onLocationChangeRef.current = onLocationChange;

  // Init map once
  useEffect(() => {
    if (getKakaoMapKeyMissing()) return;
    let cancelled = false;

    preloadKakaoMap()
      .then(() => {
        if (cancelled || !mapRef.current || mapInstance.current) return;
        const kakaoMaps = window.kakao.maps as typeof window.kakao.maps & {
          Map: new (el: HTMLElement, opts: object) => kakao.maps.Map;
          LatLng: new (lat: number, lng: number) => kakao.maps.LatLng;
          event: { addListener: (target: unknown, type: string, handler: (...args: unknown[]) => void) => void };
        };
        const map = new kakaoMaps.Map(mapRef.current, {
          center: new kakaoMaps.LatLng(location.lat, location.lng),
          level: 8,
        });
        mapInstance.current = map;

        kakaoMaps.event.addListener(map, 'dragend', () => {
          const c = map.getCenter();
          setMapCenter({ lat: c.getLat(), lng: c.getLng() });
        });

        kakaoMaps.event.addListener(map, 'click', (mouseEvent: unknown) => {
          const e = mouseEvent as { latLng: { getLat: () => number; getLng: () => number } };
          const lat = e.latLng.getLat();
          const lng = e.latLng.getLng();
          skipNextPan.current = true;
          setSelectedFacCode(null);
          setLevelPatch(null);
          setMapCenter({ lat, lng });
          setQueryCenter({ lat, lng });
          stableReservoirRows.current = [];
          onLocationChangeRef.current(
            { lat, lng, label: `지도 선택 (${lat.toFixed(3)}, ${lng.toFixed(3)})` },
            { source: 'map' },
          );
          api
            .get('/weather/reverse', { params: { lat, lng } })
            .then((res) => {
              const label = res.data?.data?.label;
              if (label) {
                onLocationChangeRef.current({ lat, lng, label }, { source: 'map' });
              }
            })
            .catch(() => {});
        });
      })
      .catch(() => {});

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, []);

  // Pan to location when it changes externally (search/GPS)
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !isKakaoMapReady()) return;
    if (skipNextPan.current) {
      skipNextPan.current = false;
      return;
    }
    const kakaoMaps = window.kakao.maps;
    map.setCenter(new kakaoMaps.LatLng(location.lat, location.lng));
  }, [location.lat, location.lng]);

  // Draw overlays
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !isKakaoMapReady()) return;

    overlays.current.forEach((o) => o.setMap(null));
    overlays.current = [];
    (circles.current as { setMap: (m: null) => void }[]).forEach((c) => c.setMap(null));
    circles.current = [];

    const kakaoMaps = window.kakao.maps as typeof window.kakao.maps & {
      LatLng: new (lat: number, lng: number) => kakao.maps.LatLng;
      CustomOverlay: new (opts: object) => kakao.maps.CustomOverlay;
      Circle: new (opts: object) => { setMap: (m: kakao.maps.Map | null) => void };
    };

    // Here pin
    {
      const pos = new kakaoMaps.LatLng(location.lat, location.lng);
      const wrap = document.createElement('div');
      wrap.innerHTML = hereMarkerHtml();
      const overlay = new kakaoMaps.CustomOverlay({
        position: pos,
        content: wrap,
        yAnchor: 1,
        xAnchor: 0.5,
        zIndex: 10,
      });
      overlay.setMap(map);
      overlays.current.push(overlay);
    }

    if (activeLayers.ban) {
      for (const zone of nearbyBans) {
        const pos = new kakaoMaps.LatLng(zone.lat, zone.lng);
        const stroke =
          zone.kind === 'prohibit' ? '#991b1b' : zone.kind === 'protect' ? '#7c2d12' : '#b91c1c';
        const fill =
          zone.kind === 'prohibit' ? '#dc2626' : zone.kind === 'protect' ? '#ea580c' : '#ef4444';
        const circle = new kakaoMaps.Circle({
          center: pos,
          radius: zone.radiusM,
          strokeWeight: 2,
          strokeColor: stroke,
          strokeOpacity: 0.9,
          strokeStyle: 'dash',
          fillColor: fill,
          fillOpacity: 0.14,
        });
        circle.setMap(map);
        circles.current.push(circle);

        const wrap = document.createElement('div');
        wrap.innerHTML = banLabelHtml(zone);
        wrap.title = `${zone.reason}${zone.address ? ` · ${zone.address}` : ''}`;
        const overlay = new kakaoMaps.CustomOverlay({
          position: pos,
          content: wrap,
          yAnchor: 1.2,
          xAnchor: 0.5,
          zIndex: 1,
        });
        overlay.setMap(map);
        overlays.current.push(overlay);
      }
    }

    if (activeLayers.sea) {
      for (const spot of seaSpots) {
        const active =
          Math.abs(spot.lat - location.lat) < 0.01 && Math.abs(spot.lng - location.lng) < 0.01;
        const pos = new kakaoMaps.LatLng(spot.lat, spot.lng);
        const wrap = document.createElement('div');
        wrap.innerHTML = spotPinHtml(spot.name, active, 'sea');
        wrap.style.cursor = 'pointer';
        wrap.onclick = (e) => {
          e.stopPropagation();
          selectSpotRef.current(spot);
        };
        const overlay = new kakaoMaps.CustomOverlay({
          position: pos,
          content: wrap,
          yAnchor: 1,
          xAnchor: 0.5,
          zIndex: active ? 6 : 3,
        });
        overlay.setMap(map);
        overlays.current.push(overlay);
      }
    }

    if (activeLayers.fresh) {
      for (const spot of freshSpots) {
        // avoid double-drawing mixed if sea also on
        if (activeLayers.sea && spot.spotType === 'mixed') continue;
        const active =
          Math.abs(spot.lat - location.lat) < 0.01 && Math.abs(spot.lng - location.lng) < 0.01;
        const pos = new kakaoMaps.LatLng(spot.lat, spot.lng);
        const wrap = document.createElement('div');
        wrap.innerHTML = spotPinHtml(spot.name, active, spot.spotType ?? 'fresh');
        wrap.style.cursor = 'pointer';
        wrap.onclick = (e) => {
          e.stopPropagation();
          selectSpotRef.current(spot);
        };
        const overlay = new kakaoMaps.CustomOverlay({
          position: pos,
          content: wrap,
          yAnchor: 1,
          xAnchor: 0.5,
          zIndex: active ? 6 : 3,
        });
        overlay.setMap(map);
        overlays.current.push(overlay);
      }
    }

    if (activeLayers.reservoir) {
      for (const row of reservoirRows) {
        const pos = new kakaoMaps.LatLng(row.lat, row.lng);
        const wrap = document.createElement('div');
        wrap.innerHTML = bubbleHtml(row, row.facCode === selectedFacCode);
        wrap.style.cursor = 'pointer';
        wrap.onclick = (e) => {
          e.stopPropagation();
          selectReservoirRef.current(row);
        };
        const overlay = new kakaoMaps.CustomOverlay({
          position: pos,
          content: wrap,
          yAnchor: 0.55,
          xAnchor: 0.5,
          zIndex: row.facCode === selectedFacCode ? 7 : 4,
        });
        overlay.setMap(map);
        overlays.current.push(overlay);
      }
    }
  }, [
    activeLayers.ban,
    activeLayers.sea,
    activeLayers.fresh,
    activeLayers.reservoir,
    nearbyBans,
    seaSpots,
    freshSpots,
    reservoirRows,
    location.lat,
    location.lng,
    selectedFacCode,
  ]);

  const handleCountyApply = (q: string) => {
    if (onCountyQueryChange) onCountyQueryChange(q);
    else setLocalCounty(q);
    if (q && !activeLayers.reservoir) setLayer('reservoir', true);
  };

  if (getKakaoMapKeyMissing()) {
    return (
      <div className="conditions-map-hub">
        <div className="reservoir-map-fallback">
          카카오맵 API 키가 없어 지도를 표시할 수 없습니다. 상단 검색으로 지역을 찾아 주세요.
        </div>
      </div>
    );
  }

  return (
    <section className="conditions-map-hub" aria-label="출조 지도">
      <div className="conditions-map-head">
        <div>
          <h3 className="weather-marine-title">지도에서 찾기</h3>
          <p className="weather-marine-muted">
            검색·지도 클릭·핀 선택으로 위치를 고르세요. 레이어로 표시 정보를 켜고 끌 수 있습니다.
          </p>
        </div>
      </div>

      <div className="conditions-map-layers" role="group" aria-label="지도 레이어">
        {(
          [
            ['sea', '바다 포인트'],
            ['fresh', '민물 포인트'],
            ['reservoir', '저수지 수위'],
            ['ban', '금어 구역'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className={`cmap-layer-toggle${activeLayers[key] ? ' on' : ''}`}>
            <input
              type="checkbox"
              checked={activeLayers[key]}
              onChange={(e) => setLayer(key, e.target.checked)}
            />
            {label}
          </label>
        ))}
      </div>

      {activeLayers.reservoir && (
        <CountySearchBar
          value={appliedCounty}
          onApply={handleCountyApply}
          regionHint={location.label}
          compact
        />
      )}

      <div className="conditions-map-canvas-wrap">
        <div ref={mapRef} className="conditions-map-canvas" />
        {(reservoirLoading || reservoirFetching) && activeLayers.reservoir && (
          <p className="conditions-map-loading" aria-live="polite">
            {reservoirRows.length ? '저수지 갱신 중…' : '저수지 불러오는 중…'}
          </p>
        )}
        {(banLoading || banFetching) && activeLayers.ban && (
          <p className="conditions-map-loading conditions-map-loading--ban" aria-live="polite">
            금어 구역 불러오는 중…
          </p>
        )}
      </div>

      <div className="conditions-map-legend">
        <span><i className="dot sea" /> 바다 포인트</span>
        <span><i className="dot fresh" /> 민물 포인트</span>
        <span><i className="dot high" /> 저수율 60%+</span>
        <span><i className="dot mid" /> 40~60%</span>
        <span><i className="dot low" /> 40% 미만</span>
        <span><i className="dot ban" /> 낚시금지</span>
        <span><i className="dot ban-restrict" /> 낚시제한·보호</span>
        <span><i className="dot here" /> 선택 위치</span>
      </div>

      {activeLayers.ban && (
        <p className="reservoir-map-ban-note">
          {banDisclaimer || '공개 지정구역 기반 안내입니다. 정확한 경계·단속은 관할 지자체 고시·현장 안내판을 확인하세요.'}
          {nearbyBans.length > 0 && ` · 표시 ${nearbyBans.length}곳`}
        </p>
      )}

      {selectedReservoir && (
        <div className="reservoir-detail-panel conditions-map-reservoir-detail">
          <div className="reservoir-detail-head">
            <strong>{selectedReservoir.facName}</strong>
            {selectedReservoir.county && <em>{selectedReservoir.county}</em>}
          </div>
          <div className="reservoir-rate-block">
            <div className="reservoir-rate-labels">
              <span>저수율</span>
              <strong style={{ color: reservoirRateColor(selectedReservoir.ratePercent) }}>
                {selectedReservoir.ratePercent != null
                  ? `${selectedReservoir.ratePercent.toFixed(1)}%`
                  : '확인 중…'}
              </strong>
            </div>
            <div
              className="reservoir-rate-gauge"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={selectedReservoir.ratePercent ?? undefined}
              aria-label="저수율"
            >
              <div
                className="reservoir-rate-gauge-fill"
                style={{
                  width: `${Math.max(0, Math.min(100, selectedReservoir.ratePercent ?? 0))}%`,
                  background: reservoirRateColor(selectedReservoir.ratePercent),
                }}
              />
            </div>
          </div>
          <div className="weather-marine-reservoir-stats">
            <div>
              <span>수위</span>
              <strong>
                {selectedReservoir.waterLevelM != null
                  ? `${selectedReservoir.waterLevelM.toFixed(2)}m`
                  : '-'}
              </strong>
            </div>
            <div>
              <span>기준일</span>
              <strong className="reservoir-check-date">
                {selectedReservoir.checkDate ? formatCheckDate(selectedReservoir.checkDate) : '-'}
              </strong>
            </div>
          </div>
          <p className="weather-marine-source">
            출처: KRC 저수지 수위
            {area?.searchQuery ? ` · ${area.searchQuery}` : ''}
            {area?.totalCount != null ? ` · 인근 ${area.totalCount}곳` : ''}
          </p>
        </div>
      )}
    </section>
  );
}
