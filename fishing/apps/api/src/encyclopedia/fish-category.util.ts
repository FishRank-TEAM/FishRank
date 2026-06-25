const FISH_SPECIES_CATEGORIES = ['freshwater', 'saltwater', 'both'] as const;

export type FishSpeciesCategory = (typeof FISH_SPECIES_CATEGORIES)[number];

const FISH_CATEGORY_LABELS: Record<FishSpeciesCategory, string> = {
  freshwater: '민물',
  saltwater: '바다',
  both: '민·바다',
};

export function isFishSpeciesCategory(value: string): value is FishSpeciesCategory {
  return (FISH_SPECIES_CATEGORIES as readonly string[]).includes(value);
}

export function buildSpeciesCategoryFilter(category?: string) {
  if (!category || category === 'all') return undefined;
  if (category === 'freshwater') {
    return { OR: [{ category: 'freshwater' }, { category: 'both' }] };
  }
  if (category === 'saltwater') {
    return { OR: [{ category: 'saltwater' }, { category: 'both' }] };
  }
  if (category === 'both') return { category: 'both' };
  if (isFishSpeciesCategory(category)) return { category };
  return undefined;
}

export function formatFishCategoryLabel(category: string): string {
  if (isFishSpeciesCategory(category)) return FISH_CATEGORY_LABELS[category];
  return category;
}

export const FISH_CATEGORY_VALUES = FISH_SPECIES_CATEGORIES;
