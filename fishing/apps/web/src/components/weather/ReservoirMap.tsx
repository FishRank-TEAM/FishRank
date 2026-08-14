'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { ReservoirMapItem } from '@/lib/marine-conditions';
import { reservoirBubbleSize, reservoirRateColor } from '@/lib/marine-conditions';
import { getKakaoMapKeyMissing, isKakaoMapReady, preloadKakaoMap } from '@/lib/kakao-map-loader';

type Props = {
  rows: ReservoirMapItem[];
  center: { lat: number; lng: number };
  selectedFacCode: string | null;
  onSelect: (row: ReservoirMapItem) => void;
};

function bubbleHtml(row: ReservoirMapItem, selected: boolean): string {
  const color = reservoirRateColor(row.ratePercent);
  const size = reservoirBubbleSize(row.ratePercent);
  const label = row.ratePercent != null ? `${Math.round(row.ratePercent)}%` : '?';
  const ring = selected ? 'box-shadow:0 0 0 3px #fff,0 0 0 5px #1565c0;' : 'box-shadow:0 1px 4px rgba(0,0,0,.25);';
  return `<div class="reservoir-map-bubble" style="width:${size}px;height:${size}px;background:${color};${ring}"><span>${label}</span></div>`;
}

export default function ReservoirMap({ rows, center, selectedFacCode, onSelect }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<kakao.maps.Map | null>(null);
  const overlays = useRef<kakao.maps.CustomOverlay[]>([]);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const mapRows = useMemo(
    () => rows.filter((r) => r.geocoded === true),
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
          level: 10,
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

    const kakaoMaps = window.kakao.maps;

    if (!mapRows.length) {
      map.setCenter(new kakaoMaps.LatLng(center.lat, center.lng));
      map.setLevel(10);
      return;
    }

    const bounds = new kakaoMaps.LatLngBounds();

    for (const row of mapRows) {
      const pos = new kakaoMaps.LatLng(row.lat, row.lng);
      bounds.extend(pos);

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
        yAnchor: 0.5,
        xAnchor: 0.5,
        zIndex: row.facCode === selectedFacCode ? 3 : 2,
      });
      overlay.setMap(map);
      overlays.current.push(overlay);
    }

    map.setBounds(bounds, 48, 48, 48, 48);
  }, [mapRows, center.lat, center.lng, selectedFacCode]);

  if (getKakaoMapKeyMissing()) {
    return (
      <div className="reservoir-map-fallback">
        카카오맵 API 키가 없어 지도를 표시할 수 없습니다. 목록 탭을 이용해 주세요.
      </div>
    );
  }

  return (
    <div className="reservoir-map-wrap">
      <div ref={mapRef} className="reservoir-map-canvas" />
      <div className="reservoir-map-legend">
        <span><i className="dot high" /> 60% 이상</span>
        <span><i className="dot mid" /> 40~60%</span>
        <span><i className="dot low" /> 40% 미만</span>
      </div>
    </div>
  );
}
