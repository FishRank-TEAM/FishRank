export const RANKING_PERIOD_TABS = [
  { key: 'weekly', label: '이번주' },
  { key: 'alltime', label: '역대' },
] as const;

export const RANKING_TYPE_TABS = [
  { key: 'official', label: '인증 랭킹' },
  { key: 'unofficial', label: '자랑 랭킹' },
] as const;

export type RankingTypeKey = (typeof RANKING_TYPE_TABS)[number]['key'];

export const DEFAULT_RANKING_SPECIES_ID = 1;
export const ALL_RANKING_SPECIES_ID = 0;

/**
 * 랭킹 필터에 노출하는 대표 어종 — prisma seed fish_species ID와 동기화
 * (전체 통합 랭킹은 체장 비교 형평성 문제로 미제공)
 */
export const RANKING_SPECIES_LIST = [
  { id: 1, name: '배스', category: 'freshwater' as const },
  { id: 2, name: '쏘가리', category: 'freshwater' as const },
  { id: 3, name: '가물치', category: 'freshwater' as const },
  { id: 4, name: '붕어', category: 'freshwater' as const },
  { id: 5, name: '잉어', category: 'freshwater' as const },
  { id: 6, name: '메기', category: 'freshwater' as const },
  { id: 17, name: '향어', category: 'freshwater' as const },
  { id: 18, name: '송어', category: 'freshwater' as const },
  { id: 8, name: '참돔', category: 'saltwater' as const },
  { id: 9, name: '광어', category: 'saltwater' as const },
  { id: 10, name: '우럭', category: 'saltwater' as const },
  { id: 11, name: '감성돔', category: 'saltwater' as const },
  { id: 12, name: '농어', category: 'saltwater' as const },
  { id: 13, name: '방어', category: 'saltwater' as const },
  { id: 15, name: '삼치', category: 'saltwater' as const },
  { id: 28, name: '돌돔', category: 'saltwater' as const },
  { id: 30, name: '볼락', category: 'saltwater' as const },
  { id: 33, name: '갈치', category: 'saltwater' as const },
] as const;

export type RankingSpeciesItem = (typeof RANKING_SPECIES_LIST)[number];
export type RankingSpeciesCategory = RankingSpeciesItem['category'];

export const RANKING_SPECIES_CATEGORY_TABS = [
  { key: 'freshwater' as const, label: '민물' },
  { key: 'saltwater' as const, label: '바다' },
];

export const RANKING_SPECIES_IDS = RANKING_SPECIES_LIST.map((s) => s.id);

export function filterRankingSpeciesByCategory(category: RankingSpeciesCategory) {
  return RANKING_SPECIES_LIST.filter((s) => s.category === category);
}

export function getRankingSpeciesCategory(speciesId: number): RankingSpeciesCategory {
  return RANKING_SPECIES_LIST.find((s) => s.id === speciesId)?.category ?? 'freshwater';
}

export function getSpeciesLabel(speciesId: number): string {
  if (speciesId === ALL_RANKING_SPECIES_ID) return '전체';
  return RANKING_SPECIES_LIST.find((s) => s.id === speciesId)?.name ?? '어종';
}

export function isValidRankingSpeciesId(id: number): boolean {
  if (id === ALL_RANKING_SPECIES_ID) return true;
  return RANKING_SPECIES_IDS.includes(id);
}
