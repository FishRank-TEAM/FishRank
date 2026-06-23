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

export const RANKING_SPECIES_LIST = [
  { id: 1, name: '배스' },
  { id: 2, name: '쏘가리' },
  { id: 3, name: '가물치' },
  { id: 8, name: '참돔' },
  { id: 9, name: '광어' },
  { id: 10, name: '우럭' },
] as const;

export function getSpeciesLabel(speciesId: number): string {
  if (speciesId === ALL_RANKING_SPECIES_ID) return '전체';
  return RANKING_SPECIES_LIST.find((s) => s.id === speciesId)?.name ?? '어종';
}

export function isValidRankingSpeciesId(id: number): boolean {
  if (id === ALL_RANKING_SPECIES_ID) return true;
  return RANKING_SPECIES_LIST.some((s) => s.id === id);
}
