export const FISH_SPECIES_CATEGORIES = ['freshwater', 'saltwater', 'both'] as const;

export type FishSpeciesCategory = (typeof FISH_SPECIES_CATEGORIES)[number];

export const FISH_CATEGORY_FILTER_TABS = [
  { key: 'all', label: '전체' },
  { key: 'freshwater', label: '민물' },
  { key: 'saltwater', label: '바다' },
  { key: 'both', label: '민·바다' },
] as const;

export const FISH_CATEGORY_OPTIONS = [
  { value: 'freshwater' as const, label: '민물' },
  { value: 'saltwater' as const, label: '바다' },
  { value: 'both' as const, label: '민·바다 (양쪽 서식)' },
];

export const FISH_CATEGORY_LABELS: Record<FishSpeciesCategory, string> = {
  freshwater: '민물',
  saltwater: '바다',
  both: '민·바다',
};

export function isFishSpeciesCategory(value: string): value is FishSpeciesCategory {
  return (FISH_SPECIES_CATEGORIES as readonly string[]).includes(value);
}

export function getFishCategoryLabel(category: string): string {
  if (category === 'saltwater') return FISH_CATEGORY_LABELS.saltwater;
  if (category === 'both') return FISH_CATEGORY_LABELS.both;
  return FISH_CATEGORY_LABELS.freshwater;
}

export function getFishCategoryDescription(category: string): string {
  if (category === 'saltwater') return '바다낚시';
  if (category === 'both') return '민물·바다';
  return '민물낚시';
}

export function getFishCategoryBadgeClass(category: string): string {
  if (category === 'saltwater') return 'site-badge-blue';
  if (category === 'both') return 'site-badge-teal';
  return 'site-badge-green';
}

export function getFishCategoryHeroClass(category: string): FishSpeciesCategory {
  if (isFishSpeciesCategory(category)) return category;
  return 'freshwater';
}

export function getFishCategoryEmoji(category: string): string {
  if (category === 'saltwater') return '🐠';
  if (category === 'both') return '🐟🌊';
  return '🐟';
}
