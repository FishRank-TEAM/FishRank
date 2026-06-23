export type FishingCategory = 'freshwater' | 'saltwater' | 'both';

export const FISHING_CATEGORY_OPTIONS: { value: FishingCategory; label: string }[] = [
  { value: 'freshwater', label: '민물' },
  { value: 'saltwater', label: '바다' },
  { value: 'both', label: '민물·바다' },
];

export function formatFishingCategory(category?: string | null): string {
  const found = FISHING_CATEGORY_OPTIONS.find((o) => o.value === category);
  return found?.label ?? '-';
}

export {
  KOREAN_REGION_GROUPS,
  formatActivityRegionLabel,
  parseActivityRegion,
  getDistrictsByProvince,
} from './korean-regions';
