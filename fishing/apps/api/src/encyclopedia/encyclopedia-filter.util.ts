import { FISH_CATALOG } from '../fish-info/fish-species-catalog';

export type EncyclopediaSort = 'name' | 'popular';
export type EncyclopediaTechnique =
  | 'all'
  | 'lure'
  | 'float'
  | 'bottom'
  | 'fly'
  | 'ice'
  | 'boat';

const TECHNIQUE_KEYWORDS: Record<Exclude<EncyclopediaTechnique, 'all'>, string[]> = {
  lure: ['루어', '지깅', '캐스팅', '스피닝', '배스피싱', '지그', '웜', '미노우'],
  float: ['찌낚시', '찌'],
  bottom: ['바닥', '밑밥', '원투', '채비', '떡밥'],
  fly: ['인공파리', '플라이'],
  ice: ['얼음'],
  boat: ['선상', '민장대', '갯바위', '하구'],
};

export function isEncyclopediaSort(value?: string): value is EncyclopediaSort {
  return value === 'name' || value === 'popular';
}

export function isEncyclopediaTechnique(value?: string): value is EncyclopediaTechnique {
  return (
    value === 'all' ||
    value === 'lure' ||
    value === 'float' ||
    value === 'bottom' ||
    value === 'fly' ||
    value === 'ice' ||
    value === 'boat'
  );
}

function textMatchesTechnique(
  text: string | null | undefined,
  technique: Exclude<EncyclopediaTechnique, 'all'>,
): boolean {
  if (!text?.trim()) return false;
  const lower = text.toLowerCase();
  return TECHNIQUE_KEYWORDS[technique].some((kw) => lower.includes(kw.toLowerCase()));
}

export function getCatalogSpeciesIdsByTechnique(technique: EncyclopediaTechnique): number[] {
  if (technique === 'all') return [];
  return FISH_CATALOG.filter((entry) => textMatchesTechnique(entry.technique, technique)).map(
    (entry) => entry.speciesId,
  );
}

export function buildTechniqueSpeciesOr(technique: EncyclopediaTechnique) {
  if (technique === 'all') return null;

  const catalogIds = getCatalogSpeciesIdsByTechnique(technique);
  const keywordOr = TECHNIQUE_KEYWORDS[technique].map((kw) => ({
    encyclopedia: { technique: { contains: kw, mode: 'insensitive' as const } },
  }));

  const or: Record<string, unknown>[] = [...keywordOr];
  if (catalogIds.length > 0) {
    or.unshift({ id: { in: catalogIds } });
  }

  return or;
}
