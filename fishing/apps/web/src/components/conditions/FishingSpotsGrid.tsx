'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { PlaceResult, WeatherLocation } from '@/lib/weather';
import { loadFavorites, type FavoriteSpot } from '@/lib/weather-favorites';

type SpotFilter = 'all' | 'sea' | 'fresh';

type Props = {
  selected: WeatherLocation;
  onSelect: (loc: WeatherLocation, spotType?: PlaceResult['spotType']) => void;
  favoritesRevision?: number;
  /** 접힌 상태에서 가로 스크롤 칩으로 표시 */
  compact?: boolean;
};

const TYPE_LABEL: Record<string, string> = {
  sea: '바다',
  fresh: '민물',
  mixed: '혼합',
};

const COLLAPSED_COUNT = 6;

export default function FishingSpotsGrid({
  selected,
  onSelect,
  favoritesRevision = 0,
  compact = false,
}: Props) {
  const [filter, setFilter] = useState<SpotFilter>('all');
  const [expanded, setExpanded] = useState(!compact);
  const [favorites, setFavorites] = useState<FavoriteSpot[]>([]);

  useEffect(() => {
    setFavorites(loadFavorites());
  }, [favoritesRevision, selected.lat, selected.lng]);

  const { data: presets = [], isLoading } = useQuery({
    queryKey: ['weather-presets'],
    queryFn: async () => {
      const res = await api.get('/weather/presets');
      return res.data.data as PlaceResult[];
    },
    staleTime: 24 * 60 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    if (filter === 'all') return presets;
    return presets.filter((p) => {
      if (!p.spotType) return false;
      if (filter === 'sea') return p.spotType === 'sea' || p.spotType === 'mixed';
      return p.spotType === 'fresh' || p.spotType === 'mixed';
    });
  }, [presets, filter]);

  const visible = expanded ? filtered : filtered.slice(0, COLLAPSED_COUNT);
  const hiddenCount = Math.max(0, filtered.length - COLLAPSED_COUNT);

  const isSelected = (place: PlaceResult) =>
    Math.abs(place.lat - selected.lat) < 0.01 && Math.abs(place.lng - selected.lng) < 0.01;

  return (
    <section className="fishing-spots-panel" id="fishing-spots">
      <div className="fishing-spots-head">
        <div>
          <h3 className="weather-marine-title">낚시 포인트</h3>
          <p className="weather-marine-muted">
            추천 포인트를 고르면 아래 낚시지수·물때·저수지가 해당 위치로 바뀝니다
          </p>
        </div>
        <div className="reservoir-view-toggle" role="tablist" aria-label="포인트 유형">
          {([
            ['all', '전체'],
            ['sea', '바다'],
            ['fresh', '민물'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              className={filter === key ? 'active' : undefined}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {favorites.length > 0 && (
        <div className="fishing-spots-fav-row">
          <span>즐겨찾기</span>
          {favorites.map((fav) => (
            <button
              key={fav.id}
              type="button"
              className="conditions-county-chip"
              onClick={() => onSelect({ lat: fav.lat, lng: fav.lng, label: fav.label })}
            >
              {fav.label}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <p className="weather-marine-muted">포인트를 불러오는 중…</p>
      ) : filtered.length === 0 ? (
        <div className="conditions-empty fishing-spots-empty">
          <p className="weather-marine-muted">
            {filter === 'all' ? '등록된 포인트가 없습니다.' : `${TYPE_LABEL[filter] ?? filter} 포인트가 없습니다.`}
          </p>
          {filter !== 'all' && (
            <button type="button" className="county-search-btn ghost" onClick={() => setFilter('all')}>
              전체 보기
            </button>
          )}
        </div>
      ) : (
        <>
          <div className={`fishing-spots-grid${compact && !expanded ? ' fishing-spots-grid--compact' : ''}`}>
            {visible.map((place) => (
              <button
                key={place.id}
                type="button"
                className={`fishing-spot-card${isSelected(place) ? ' selected' : ''}`}
                onClick={() =>
                  onSelect({ lat: place.lat, lng: place.lng, label: place.name }, place.spotType)
                }
              >
                <strong>{place.name}</strong>
                <span>{place.address}</span>
                {place.spotType && (
                  <em className={`fishing-spot-type ${place.spotType}`}>
                    {TYPE_LABEL[place.spotType] ?? place.spotType}
                  </em>
                )}
              </button>
            ))}
          </div>
          {compact && hiddenCount > 0 && (
            <button
              type="button"
              className="fishing-spots-more"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? '포인트 접기' : `포인트 ${hiddenCount}곳 더보기`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
