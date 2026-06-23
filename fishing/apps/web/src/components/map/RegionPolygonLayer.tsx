'use client';

import { memo, useEffect, useRef } from 'react';
import { loadGeoJsonForZoom, type GeoFeature } from '@/lib/geo/geoJsonLoader';
import { getSigRegionKey, type RegionLevel } from '@/lib/korean-regions';

export type RegionalKingSummary = {
  regionKey: string;
  regionName: string;
  recordCount: number;
  king: {
    user: { nickname: string; profileImage?: string | null };
    catch?: { imageUrl?: string };
    fishSpecies?: { nameKo: string } | null;
    lengthCm: number;
    grade: string | null;
  } | null;
};

type Props = {
  map: kakao.maps.Map | null;
  level: RegionLevel;
  kingsByRegion: Record<string, RegionalKingSummary>;
  onRegionSelect: (regionKey: string, regionName: string) => void;
};

function parsePaths(
  geometry: GeoFeature['geometry'],
  kakaoMaps: typeof kakao.maps,
): kakao.maps.LatLng[][] {
  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates as number[][][][]).map((poly) =>
      poly[0].map((c) => new kakaoMaps.LatLng(c[1], c[0])),
    );
  }
  return [
    (geometry.coordinates as number[][][])[0].map(
      (c) => new kakaoMaps.LatLng(c[1], c[0]),
    ),
  ];
}

function getRegionKeyFromFeature(feature: GeoFeature, level: RegionLevel): string | null {
  const props = feature.properties;
  if (level === 'sido') {
    return props.SIG_KOR_NM || props.SIDO_NM || null;
  }
  if (props.SIG_CD && props.SIG_KOR_NM) {
    return getSigRegionKey(props.SIG_CD, props.SIG_KOR_NM);
  }
  return null;
}

function getRegionNameFromFeature(feature: GeoFeature, level: RegionLevel): string {
  const props = feature.properties;
  if (level === 'sido') {
    return props.SIG_KOR_NM || props.SIDO_NM || '지역';
  }
  return props.SIG_KOR_NM || '지역';
}

function getPolygonCenter(path: kakao.maps.LatLng[]): kakao.maps.LatLng {
  const lat = path.reduce((sum, p) => sum + p.getLat(), 0) / path.length;
  const lng = path.reduce((sum, p) => sum + p.getLng(), 0) / path.length;
  return new kakao.maps.LatLng(lat, lng);
}

function RegionPolygonLayer({ map, level, kingsByRegion, onRegionSelect }: Props) {
  const polygons = useRef<kakao.maps.Polygon[]>([]);
  const overlays = useRef<kakao.maps.CustomOverlay[]>([]);
  const selectedPolygon = useRef<kakao.maps.Polygon | null>(null);
  const onSelectRef = useRef(onRegionSelect);
  const kingsRef = useRef(kingsByRegion);

  onSelectRef.current = onRegionSelect;
  kingsRef.current = kingsByRegion;

  useEffect(() => {
    if (!map) return;

    const kakaoMaps = window.kakao.maps;
    let cancelled = false;
    let zoomListener: unknown = null;
    const polygonMeta = new Map<kakao.maps.Polygon, { hasKing: boolean }>();

    const clearLayers = () => {
      polygons.current.forEach((p) => p.setMap(null));
      overlays.current.forEach((o) => o.setMap(null));
      polygons.current = [];
      overlays.current = [];
      polygonMeta.clear();
    };

    const defaultStyle = (hasKing: boolean) => ({
      strokeWeight: 2,
      strokeColor: hasKing ? '#1565c0' : '#546e7a',
      fillColor: hasKing ? '#64b5f6' : '#ffffff',
      fillOpacity: hasKing ? 0.35 : 0.12,
    });

    const loadPolygons = async (zoomLevel: number) => {
      clearLayers();
      selectedPolygon.current = null;

      try {
        const geo = await loadGeoJsonForZoom(zoomLevel);
        if (cancelled) return;

        geo.features.forEach((feature) => {
          const regionKey = getRegionKeyFromFeature(feature, level);
          if (!regionKey) return;

          const regionName = getRegionNameFromFeature(feature, level);
          const kingData = kingsRef.current[regionKey];
          const hasKing = !!kingData?.king;
          const paths = parsePaths(feature.geometry, kakaoMaps);

          paths.forEach((path) => {
            const polygon = new kakaoMaps.Polygon({
              map,
              path,
              ...defaultStyle(hasKing),
            });
            polygonMeta.set(polygon, { hasKing });

            kakaoMaps.event.addListener(polygon, 'mouseover', () => {
              if (selectedPolygon.current !== polygon) {
                polygon.setOptions({
                  fillColor: hasKing ? '#90caf9' : '#e3f2fd',
                  fillOpacity: hasKing ? 0.5 : 0.25,
                });
              }
            });

            kakaoMaps.event.addListener(polygon, 'mouseout', () => {
              if (selectedPolygon.current !== polygon) {
                polygon.setOptions(defaultStyle(hasKing));
              }
            });

            kakaoMaps.event.addListener(polygon, 'click', () => {
              if (selectedPolygon.current) {
                const meta = polygonMeta.get(selectedPolygon.current);
                selectedPolygon.current.setOptions(defaultStyle(meta?.hasKing ?? false));
              }

              polygon.setOptions({
                fillColor: '#1976d2',
                strokeColor: '#0d47a1',
                strokeWeight: 3,
                fillOpacity: 0.65,
              });
              selectedPolygon.current = polygon;
              onSelectRef.current(regionKey, regionName);
            });

            polygons.current.push(polygon);

            if (hasKing && kingData?.king) {
              const center = getPolygonCenter(path);
              const overlay = new kakaoMaps.CustomOverlay({
                map,
                position: center,
                yAnchor: 1.2,
                content: `<div style="
                  background:rgba(11,31,58,0.88);
                  color:#fff;
                  padding:4px 8px;
                  border-radius:12px;
                  font-size:11px;
                  font-weight:700;
                  white-space:nowrap;
                  border:1px solid rgba(100,181,246,0.5);
                  box-shadow:0 2px 8px rgba(0,0,0,0.25);
                  pointer-events:none;
                ">👑 ${kingData.king.user.nickname}</div>`,
              });
              overlays.current.push(overlay);
            }
          });
        });
      } catch (e) {
        console.error('지도 폴리곤 GeoJSON 로드 실패:', e);
      }
    };

    void loadPolygons(map.getLevel());

    zoomListener = kakaoMaps.event.addListener(map, 'zoom_changed', () => {
      void loadPolygons(map.getLevel());
    });

    return () => {
      cancelled = true;
      if (zoomListener) {
        kakaoMaps.event.removeListener(map, 'zoom_changed', zoomListener);
      }
      clearLayers();
      selectedPolygon.current = null;
    };
  }, [map, level, kingsByRegion]);

  return null;
}

export default memo(RegionPolygonLayer);
