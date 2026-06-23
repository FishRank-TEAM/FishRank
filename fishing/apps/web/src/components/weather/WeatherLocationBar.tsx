'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { PlaceResult, WeatherLocation } from '@/lib/weather';
import {
  addFavorite,
  loadFavorites,
  removeFavorite,
  type FavoriteSpot,
} from '@/lib/weather-favorites';

type Props = {
  location: WeatherLocation;
  onLocationChange: (loc: WeatherLocation) => void;
  onGpsRequest: () => void;
  gpsLoading?: boolean;
  gpsError?: string;
};

export default function WeatherLocationBar({
  location,
  onLocationChange,
  onGpsRequest,
  gpsLoading = false,
  gpsError = '',
}: Props) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [favorites, setFavorites] = useState<FavoriteSpot[]>([]);
  const [showResults, setShowResults] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const { data: presets = [] } = useQuery({
    queryKey: ['weather-presets'],
    queryFn: async () => {
      const res = await api.get('/weather/presets');
      return res.data.data as PlaceResult[];
    },
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ['weather-search', debouncedQuery],
    queryFn: async () => {
      const res = await api.get('/weather/search', { params: { q: debouncedQuery } });
      return res.data.data as PlaceResult[];
    },
    enabled: debouncedQuery.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const results = debouncedQuery ? searchResults : presets;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectPlace = (place: PlaceResult) => {
    onLocationChange({ lat: place.lat, lng: place.lng, label: place.name });
    setQuery('');
    setShowResults(false);
  };

  const handleFavorite = () => {
    setFavorites(addFavorite(location));
  };

  const handleRemoveFavorite = (id: string) => {
    setFavorites(removeFavorite(id));
  };

  const isFavorited = favorites.some(
    (f) => f.lat.toFixed(4) === location.lat.toFixed(4) && f.lng.toFixed(4) === location.lng.toFixed(4),
  );

  return (
    <section className="weather-g-header">
      <div className="weather-g-header-top">
        <div className="weather-g-header-loc">
          <h2 className="weather-g-loc-name">{location.label}</h2>
          <button
            type="button"
            className={`weather-g-loc-gps${gpsLoading ? ' loading' : ''}`}
            onClick={onGpsRequest}
            disabled={gpsLoading}
          >
            {gpsLoading ? '⊙ 위치 확인 중…' : '⊕ 현재 위치 사용'}
          </button>
          {gpsError && <p className="weather-g-loc-gps-error">{gpsError}</p>}
        </div>
        <div className="weather-g-header-actions">
          {!isFavorited && (
            <button type="button" className="weather-g-loc-fav" onClick={handleFavorite} title="즐겨찾기">
              ☆
            </button>
          )}
        </div>
      </div>

      <div className="weather-g-search" ref={wrapRef}>
        <span className="weather-g-search-icon" aria-hidden>🔍</span>
        <input
          type="search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
          onFocus={() => setShowResults(true)}
          placeholder="지역·포인트 검색"
          className="weather-g-search-input"
          autoComplete="off"
        />
        {query && (
          <button type="button" className="weather-g-search-clear" onClick={() => { setQuery(''); setShowResults(true); }} aria-label="지우기">×</button>
        )}
        {showResults && (
          <div className="weather-g-search-results">
            <p className="weather-g-search-title">{debouncedQuery ? '검색 결과' : '추천 낚시 포인트'}</p>
            {searching && <p className="weather-search-hint">검색 중...</p>}
            {!searching && results.length === 0 && <p className="weather-search-hint">결과 없음</p>}
            {results.map((place) => (
              <button key={place.id} type="button" className="weather-search-item" onClick={() => selectPlace(place)}>
                <span className="weather-search-item-name">{place.name}</span>
                <span className="weather-search-item-addr">{place.address}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {favorites.length > 0 && (
        <div className="weather-favorites">
          <span className="weather-favorites-label">즐겨찾기</span>
          <div className="weather-favorites-chips">
            {favorites.map((fav) => (
              <span key={fav.id} className="weather-fav-chip">
                <button type="button" onClick={() => onLocationChange(fav)}>{fav.label}</button>
                <button type="button" className="weather-fav-remove" onClick={() => handleRemoveFavorite(fav.id)} aria-label="삭제">×</button>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
