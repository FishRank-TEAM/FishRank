'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { WeatherData, WeatherLocation } from '@/lib/weather';
import { DEFAULT_LOCATION, loadLastLocation, saveLastLocation } from '@/lib/weather-favorites';

const WEATHER_STALE_MS = 3 * 60 * 1000;
const KOREA_BOUNDS = { latMin: 33, latMax: 39, lngMin: 124, lngMax: 132 };

function isInKorea(lat: number, lng: number) {
  return lat >= KOREA_BOUNDS.latMin
    && lat <= KOREA_BOUNDS.latMax
    && lng >= KOREA_BOUNDS.lngMin
    && lng <= KOREA_BOUNDS.lngMax;
}

async function fetchWeather(location: WeatherLocation): Promise<WeatherData> {
  const res = await api.get('/weather', {
    params: { lat: location.lat, lng: location.lng, label: location.label },
  });
  return res.data.data;
}

async function resolveLocationLabel(lat: number, lng: number): Promise<string> {
  try {
    const res = await api.get('/weather/reverse', { params: { lat, lng } });
    return res.data.data?.label ?? '현재 위치';
  } catch {
    return '현재 위치';
  }
}

export function useWeatherLocation() {
  const [location, setLocationState] = useState<WeatherLocation>(DEFAULT_LOCATION);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const initialized = useRef(false);

  const setLocation = useCallback((loc: WeatherLocation) => {
    saveLastLocation(loc);
    setLocationState(loc);
    setGpsError('');
  }, []);

  const requestGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('이 브라우저는 위치 정보를 지원하지 않습니다.');
      return;
    }

    setGpsLoading(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        if (!isInKorea(lat, lng)) {
          setGpsError('한국 지역에서만 날씨를 조회할 수 있습니다.');
          setGpsLoading(false);
          return;
        }

        const tempLoc: WeatherLocation = { lat, lng, label: '현재 위치' };
        saveLastLocation(tempLoc);
        setLocationState(tempLoc);

        const label = await resolveLocationLabel(lat, lng);
        setLocation({ lat, lng, label });
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('위치 권한이 필요합니다. 브라우저 설정에서 허용해 주세요.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGpsError('위치를 가져올 수 없습니다.');
        } else {
          setGpsError('위치 조회 시간이 초과되었습니다. 다시 시도해 주세요.');
        }
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 120000 },
    );
  }, [setLocation]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const saved = loadLastLocation();
    if (saved) {
      setLocationState(saved);
      return;
    }
    requestGps();
  }, [requestGps]);

  return { location, setLocation, requestGps, gpsLoading, gpsError };
}

export function useWeather(location: WeatherLocation, enabled = true) {
  const query = useQuery({
    queryKey: ['weather', Number(location.lat.toFixed(4)), Number(location.lng.toFixed(4))],
    queryFn: () => fetchWeather(location),
    enabled,
    staleTime: WEATHER_STALE_MS,
    gcTime: 30 * 60 * 1000,
    placeholderData: (previous) => previous,
    retry: 1,
  });

  const msg = query.error
    ? (query.error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
    : undefined;

  return {
    weather: query.data ?? null,
    loading: query.isLoading,
    fetching: query.isFetching,
    error: msg
      ? (Array.isArray(msg) ? msg.join(', ') : msg)
      : query.isError
        ? '날씨 정보를 가져올 수 없습니다'
        : '',
  };
}
