'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { getKakaoMapKeyMissing, isKakaoMapReady, preloadKakaoMap } from '@/lib/kakao-map-loader';
import RegionPolygonLayer, { type RegionalKingSummary } from '@/components/map/RegionPolygonLayer';
import RegionalSidebar from '@/components/map/RegionalSidebar';
import RankingOvertakeFeed from '@/components/ranking/RankingOvertakeFeed';
import type { RegionLevel } from '@/lib/korean-regions';
import {
  anchorFromRegionKey,
  regionKeyForLevel,
  useRegionalAnchor,
} from '@/hooks/useRegionalAnchor';

import type { RankingTypeKey } from '@/lib/ranking.constants';

type Props = {
  period: string;
  speciesId: number;
  rankingType: RankingTypeKey;
};

function KakaoMapError({ message }: { message: string }) {
  return (
    <div className="regional-map-loading">
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚠️</div>
      <p style={{ margin: '0 0 8px', color: '#c62828', fontSize: '14px', fontWeight: 700 }}>
        {message}
      </p>
      <p style={{ margin: 0, color: '#546e7a', fontSize: '12px', lineHeight: 1.7, maxWidth: '360px', textAlign: 'center' }}>
        카카오 개발자 콘솔에서 아래를 확인해 주세요.
        <br />
        1. 제품 설정 → <strong>카카오맵</strong> 활성화
        <br />
        2. 플랫폼 키 → <strong>JavaScript 키</strong> 사용 (REST API 키 아님)
        <br />
        3. JavaScript SDK 도메인에 <strong>http://localhost:3000</strong> 등록
        <br />
        4. 변경 후 <strong>npm run dev</strong> 재시작
      </p>
    </div>
  );
}

export default function RegionalRankingMap({ period, speciesId, rankingType }: Props) {
  const anchor = useRegionalAnchor();
  const defaultAnchorRef = useRef<typeof anchor>(null);
  const workingAnchorRef = useRef<typeof anchor>(null);

  const [kakaoReady, setKakaoReady] = useState(() => isKakaoMapReady());
  const [kakaoError, setKakaoError] = useState<string | null>(
    getKakaoMapKeyMissing() ? 'NEXT_PUBLIC_KAKAO_MAP_API_KEY가 설정되지 않았습니다.' : null,
  );
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<kakao.maps.Map | null>(null);
  const mapCenteredRef = useRef(false);
  const [mapLevel, setMapLevel] = useState<'sido' | 'sig'>('sido');
  const [selectedRegionKey, setSelectedRegionKey] = useState<string | null>(null);
  const [selectedRegionName, setSelectedRegionName] = useState('');

  const regionLevel: RegionLevel = mapLevel;

  const applyAnchorSelection = useCallback((level: RegionLevel) => {
    const current = workingAnchorRef.current;
    if (!current) return;
    const { key, name } = regionKeyForLevel(current, level);
    setSelectedRegionKey(key);
    setSelectedRegionName(name);
  }, []);

  useEffect(() => {
    if (!anchor) return;
    if (!defaultAnchorRef.current) {
      defaultAnchorRef.current = anchor;
      workingAnchorRef.current = anchor;
      applyAnchorSelection(regionLevel);
    }
  }, [anchor, applyAnchorSelection, regionLevel]);

  useEffect(() => {
    if (!workingAnchorRef.current) return;
    applyAnchorSelection(regionLevel);
  }, [regionLevel, applyAnchorSelection]);

  const { data: regionalData, isLoading } = useQuery({
    queryKey: ['rankings-regional', period, speciesId, regionLevel, rankingType],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        periodType: period,
        level: regionLevel,
        rankingType,
        speciesId,
      };
      const res = await api.get('/rankings/regional', { params });
      return res.data.data;
    },
  });

  const kingsByRegion = useMemo(() => {
    const map: Record<string, RegionalKingSummary> = {};
    regionalData?.regions?.forEach((r: RegionalKingSummary) => {
      map[r.regionKey] = r;
    });
    return map;
  }, [regionalData]);

  const { data: detailData, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['rankings-regional-detail', selectedRegionKey, period, speciesId, regionLevel, rankingType],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        regionKey: selectedRegionKey!,
        periodType: period,
        level: regionLevel,
        limit: 10,
        rankingType,
      };
      if (speciesId > 0) params.speciesId = speciesId;
      const res = await api.get('/rankings/regional/detail', { params });
      return res.data.data;
    },
    enabled: !!selectedRegionKey,
  });

  useEffect(() => {
    if (kakaoError) return;
    if (kakaoReady) return;

    let cancelled = false;
    preloadKakaoMap()
      .then(() => {
        if (!cancelled) setKakaoReady(true);
      })
      .catch((err: Error) => {
        if (!cancelled) setKakaoError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [kakaoError, kakaoReady]);

  useEffect(() => {
    if (!kakaoReady || !mapRef.current || mapInstance.current) return;

    const kakaoMaps = window.kakao.maps;
    const centerSource = workingAnchorRef.current ?? anchor;
    const map = new kakaoMaps.Map(mapRef.current, {
      center: new kakaoMaps.LatLng(
        centerSource?.lat ?? 37.5172,
        centerSource?.lng ?? 127.0473,
      ),
      level: 13,
    });

    map.addControl(new kakaoMaps.ZoomControl(), kakaoMaps.ControlPosition.RIGHT);
    map.addControl(new kakaoMaps.MapTypeControl(), kakaoMaps.ControlPosition.TOPRIGHT);

    const syncLevel = () => {
      setMapLevel(map.getLevel() <= 10 ? 'sig' : 'sido');
    };

    kakaoMaps.event.addListener(map, 'zoom_changed', syncLevel);
    syncLevel();

    mapInstance.current = map;
    setMapReady(true);

    return () => {
      kakaoMaps.event.removeListener(map, 'zoom_changed', syncLevel);
      mapInstance.current = null;
      setMapReady(false);
      mapCenteredRef.current = false;
    };
  }, [kakaoReady, anchor, applyAnchorSelection]);

  useEffect(() => {
    if (!mapReady || !mapInstance.current || !anchor || mapCenteredRef.current) return;

    const kakaoMaps = window.kakao.maps;
    mapInstance.current.setCenter(new kakaoMaps.LatLng(anchor.lat, anchor.lng));
    mapCenteredRef.current = true;
  }, [mapReady, anchor]);

  useEffect(() => {
    if (!mapReady || !mapInstance.current || !mapRef.current) return;

    const map = mapInstance.current;
    const stage = mapRef.current.parentElement;
    const relayout = () => map.relayout();
    relayout();

    const observer = new ResizeObserver(relayout);
    if (stage) observer.observe(stage);

    return () => observer.disconnect();
  }, [mapReady]);

  const handleRegionSelect = useCallback((regionKey: string, regionName: string) => {
    workingAnchorRef.current = anchorFromRegionKey(regionKey, regionLevel);
    setSelectedRegionKey(regionKey);
    setSelectedRegionName(regionName);
  }, [regionLevel]);

  const kingCount = regionalData?.regions?.filter((r: RegionalKingSummary) => r.king).length ?? 0;

  return (
    <div className="regional-page">
      <div className="regional-map-layout">
        <div className="regional-map-main">
          <div className="regional-map-toolbar">
            <span className="regional-map-toolbar-label">
              {mapLevel === 'sido' ? '시·도' : '시·군·구'} · 낚시왕 {kingCount}곳
            </span>
            {isLoading && <span className="regional-map-toolbar-loading">불러오는 중...</span>}
          </div>

          {kakaoError ? (
            <KakaoMapError message={kakaoError} />
          ) : (
            <div className="regional-map-stage">
              <div ref={mapRef} className="regional-map-container" />
              {!kakaoReady && (
                <div className="regional-map-loading regional-map-loading-overlay">
                  <div className="regional-map-loading-spinner" aria-hidden />
                  <p style={{ margin: 0, color: '#546e7a', fontSize: '14px' }}>지도 불러오는 중...</p>
                </div>
              )}
            </div>
          )}

          {mapReady && mapInstance.current && (
            <RegionPolygonLayer
              map={mapInstance.current}
              level={regionLevel}
              kingsByRegion={kingsByRegion}
              onRegionSelect={handleRegionSelect}
            />
          )}
        </div>

        <RegionalSidebar
          regionKey={selectedRegionKey}
          regionName={selectedRegionName}
          kingSummary={selectedRegionKey ? kingsByRegion[selectedRegionKey] ?? null : null}
          detailRankings={detailData?.rankings ?? null}
          isLoadingDetail={isLoadingDetail || !selectedRegionKey}
        />
      </div>

      {rankingType === 'official' && (
        <div className="regional-overtake-row">
          <RankingOvertakeFeed layout="row" limit={6} />
        </div>
      )}
    </div>
  );
}
