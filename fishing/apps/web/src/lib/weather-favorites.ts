import type { WeatherLocation } from '@/lib/weather';

const STORAGE_KEY = 'fishrank_weather_favorites';
const LAST_LOCATION_KEY = 'fishrank_weather_last_location';

export type FavoriteSpot = WeatherLocation & { id: string };

export function loadFavorites(): FavoriteSpot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveFavorites(favorites: FavoriteSpot[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
}

export function addFavorite(spot: WeatherLocation): FavoriteSpot[] {
  const favorites = loadFavorites();
  const id = `${spot.lat.toFixed(4)},${spot.lng.toFixed(4)}`;
  if (favorites.some((f) => f.id === id)) return favorites;
  const next = [...favorites, { ...spot, id }].slice(0, 10);
  saveFavorites(next);
  return next;
}

export function removeFavorite(id: string): FavoriteSpot[] {
  const next = loadFavorites().filter((f) => f.id !== id);
  saveFavorites(next);
  return next;
}

export const DEFAULT_LOCATION: WeatherLocation = {
  lat: 37.5665,
  lng: 126.978,
  label: '서울 (기본)',
};

export function loadLastLocation(): WeatherLocation | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherLocation;
    if (
      typeof parsed.lat === 'number'
      && typeof parsed.lng === 'number'
      && typeof parsed.label === 'string'
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveLastLocation(location: WeatherLocation) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify(location));
}
