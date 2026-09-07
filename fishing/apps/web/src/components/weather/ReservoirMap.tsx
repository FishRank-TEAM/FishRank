'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlaceResult } from '@/lib/weather';
import type { ReservoirMapItem } from '@/lib/marine-conditions';
import { reservoirBubbleSize, reservoirRateColor } from '@/lib/marine-conditions';
import { useFishingBans } from '@/hooks/useFishingBans';
import { getKakaoMapKeyMissing, isKakaoMapReady, preloadKakaoMap } from '@/lib/kakao-map-loader';

type Props = {
  rows: ReservoirMapItem[];
  center: { lat: number; lng: number };
  selectedFacCode: string | null;
  onSelect: (row: ReservoirMapItem) => void;
  fishingSpots?: PlaceResult[];
  onSelectSpot?: (spot: PlaceResult) => void;
  showBanZones?: boolean;
  showSpots?: boolean;
};

function shortName(name: string): string {
  return name.replace(/\(.*?\)/g, '').trim().slice(0, 6);
}

function bubbleHtml(row: ReservoirMapItem, selected: boolean): string {
  const color = reservoirRateColor(row.ratePercent);
  const size = Math.max(reservoirBubbleSize(row.ratePercent), 36);
  const rateLabel = row.ratePercent != null ? `${Math.round(row.ratePercent)}%` : '·';
  const name = shortName(row.facName);
  const ring = selected
    ? 'box-shadow:0 0 0 3px #fff,0 0 0 6px #0A2540;'
    : 'box-shadow:0 2px 8px rgba(0,0,0,.28);';
  return `
    <div class="rmap-marker" style="${ring}">
      <div class="rmap-marker-bubble" style="width:${size}px;height:${size}px;background:${color}">
        <strong>${rateLabel}</strong>
      </div>
      <span class="rmap-marker-name">${name}</span>
    </div>
  `;
}

function banLabelHtml(name: string, kind?: string): string {
  const kindLabel = kind === 'prohibit' ? '금지' : kind === 'protect' ? '보호' : '제한';
  return `<div class="rmap-ban-label">${kindLabel} · ${name}</div>`;
}

function spotPinHtml(name: string, active: boolean): string {
  return `<div class="rmap-spot-pin${active ? ' active' : ''}"><i></i><span>${shortName(name)}</span></div>`;
}

export default function ReservoirMap({
  rows,
  center,
  selectedFacCode,
  onSelect,
  fishingSpots = [],
  onSelectSpot,
  showBanZones = true,
  showSpots = true,
}: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<kakao.maps.Map | null>(null);
  const overlays = useRef<kakao.maps.CustomOverlay[]>([]);
  const circles = useRef<kakao.maps.Circle[]>([]);
  const onSelectRef = useRef(onSelect);
  const onSelectSpotRef = useRef(onSelectSpot);
  onSelectRef.current = onSelect;
  onSelectSpotRef.current = onSelectSpot;

  const [banOn, setBanOn] = useState(showBanZones);
  const [spotsOn, setSpotsOn] = useState(showSpots);

  const { zones: nearbyBans, disclaimer: banDisclaimer } = useFishingBans(
    center,
    banOn,
    90,
  );

  const mapRows = useMemo(
    () => rows.filter((r) => r.geocoded === true && Number.isFinite(r.lat) && Number.isFinite(r.lng)),
    [rows],
  );

  useEffect(() => {
    if (getKakaoMapKeyMissing()) return;
    let cancelled = false;

    preloadKakaoMap()
      .then(() => {
        if (cancelled || !mapRef.current || mapInstance.current) return;
        const kakaoMaps = window.kakao.maps;
        mapInstance.current = new kakaoMaps.Map(mapRef.current, {
          center: new kakaoMaps.LatLng(center.lat, center.lng),
          level: 9,
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [center.lat, center.lng]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !isKakaoMapReady()) return;

    overlays.current.forEach((o) => o.setMap(null));
    overlays.current = [];
    circles.current.forEach((c) => c.setMap(null));
    circles.current = [];

    const kakaoMaps = window.kakao.maps;
    const bounds = new kakaoMaps.LatLngBounds();
    let hasBoundPoint = false;

    if (banOn) {
      for (const zone of nearbyBans) {
        const pos = new kakaoMaps.LatLng(zone.lat, zone.lng);
        const circle = new kakaoMaps.Circle({
          center: pos,
          radius: zone.radiusM,
          strokeWeight: 2,
          strokeColor: '#b91c1c',
          strokeOpacity: 0.85,
          strokeStyle: 'dash',
          fillColor: '#ef4444',
          fillOpacity: 0.12,
        });
        circle.setMap(map);
        circles.current.push(circle);

        const wrap = document.createElement('div');
        wrap.innerHTML = banLabelHtml(zone.name, zone.kind);
        wrap.title = zone.reason;
        const overlay = new kakaoMaps.CustomOverlay({
          position: pos,
          content: wrap,
          yAnchor: 1.2,
          xAnchor: 0.5,
          zIndex: 1,
        });
        overlay.setMap(map);
        overlays.current.push(overlay);
        bounds.extend(pos);
        hasBoundPoint = true;
      }
    }

    if (spotsOn) {
      for (const spot of fishingSpots) {
        const pos = new kakaoMaps.LatLng(spot.lat, spot.lng);
        const wrap = document.createElement('div');
        wrap.innerHTML = spotPinHtml(spot.name, false);
        wrap.style.cursor = 'pointer';
        wrap.onclick = (e) => {
          e.stopPropagation();
          onSelectSpotRef.current?.(spot);
        };
        const overlay = new kakaoMaps.CustomOverlay({
          position: pos,
          content: wrap,
          yAnchor: 1,
          xAnchor: 0.5,
          zIndex: 2,
        });
        overlay.setMap(map);
        overlays.current.push(overlay);
        bounds.extend(pos);
        hasBoundPoint = true;
      }
    }

    for (const row of mapRows) {
      const pos = new kakaoMaps.LatLng(row.lat, row.lng);
      bounds.extend(pos);
      hasBoundPoint = true;

      const wrap = document.createElement('div');
      wrap.innerHTML = bubbleHtml(row, row.facCode === selectedFacCode);
      wrap.style.cursor = 'pointer';
      wrap.onclick = (e) => {
        e.stopPropagation();
        onSelectRef.current(row);
      };

      const overlay = new kakaoMaps.CustomOverlay({
        position: pos,
        content: wrap,
        yAnchor: 0.55,
        xAnchor: 0.5,
        zIndex: row.facCode === selectedFacCode ? 5 : 3,
      });
      overlay.setMap(map);
      overlays.current.push(overlay);
    }

    if (mapRows.length || (hasBoundPoint && (banOn || spotsOn))) {
      if (mapRows.length) {
        map.setBounds(bounds, 56, 56, 56, 56);
      } else {
        map.setCenter(new kakaoMaps.LatLng(center.lat, center.lng));
        map.setLevel(9);
      }
    } else {
      map.setCenter(new kakaoMaps.LatLng(center.lat, center.lng));
      map.setLevel(9);
    }
  }, [mapRows, center.lat, center.lng, selectedFacCode, banOn, spotsOn, nearbyBans, fishingSpots]);

  if (getKakaoMapKeyMissing()) {
    return (
      <div className="reservoir-map-fallback">
        카카오맵 API 키가 없어 지도를 표시할 수 없습니다. 목록 탭을 이용해 주세요.
      </div>
    );
  }

  return (
    <div className="reservoir-map-wrap">
      <div className="reservoir-map-toolbar">
        <label className={`rmap-toggle${banOn ? ' on' : ''}`}>
          <input type="checkbox" checked={banOn} onChange={(e) => setBanOn(e.target.checked)} />
          금어 구역
        </label>
        <label className={`rmap-toggle${spotsOn ? ' on' : ''}`}>
          <input type="checkbox" checked={spotsOn} onChange={(e) => setSpotsOn(e.target.checked)} />
          낚시 포인트
        </label>
      </div>
      <div ref={mapRef} className="reservoir-map-canvas reservoir-map-canvas--tall" />
      <div className="reservoir-map-legend">
        <span><i className="dot high" /> 수위 60%+</span>
        <span><i className="dot mid" /> 40~60%</span>
        <span><i className="dot low" /> 40% 미만</span>
        <span><i className="dot unknown" /> 수위 미확인</span>
        <span><i className="dot ban" /> 낚시금지·제한</span>
      </div>
      {banOn && (
        <p className="reservoir-map-ban-note">
          {banDisclaimer || '공개 지정구역 기반 안내입니다. 정확한 경계는 관할 지자체 고시를 확인하세요.'}
        </p>
      )}
    </div>
  );
}
