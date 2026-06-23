import type { MofFishSpeciesRow } from './public-data-fish.client';
import {
  FISHING_SPECIES_BY_SCIENTIFIC,
  getStaticFishingSpecies,
  isFishableSpecies,
  isMarineAnglingSpecies,
  resolveFishingCategory,
  resolveFishingNames,
} from './korean-fishing-species.data';

export type ImportableFishRow = MofFishSpeciesRow & { fishable: true };

/** MOF + 정적 민물 목록을 합쳐 낚시 대상 어종만 반환 */
export function buildFishableImportRows(mofRows: MofFishSpeciesRow[]): ImportableFishRow[] {
  const bySci = new Map<string, ImportableFishRow>();

  for (const row of mofRows) {
    if (!isFishableSpecies(row.nameKo, row.nameEn, row.scientificName)) continue;

    const binomial = row.scientificName.trim().toLowerCase().split(/\s+/).slice(0, 2).join(' ');
    const isStaticFresh = FISHING_SPECIES_BY_SCIENTIFIC[binomial]?.category === 'freshwater';
    const isStaticBrackish = FISHING_SPECIES_BY_SCIENTIFIC[binomial]?.category === 'brackish';

    if (!isStaticFresh && !isStaticBrackish && !isMarineAnglingSpecies(row.nameKo, row.scientificName, row.nameEn)) {
      continue;
    }

    const names = resolveFishingNames(row.nameKo, row.nameEn, row.scientificName);
    const category = resolveFishingCategory(names.nameKo, row.scientificName);
    const sciKey = row.scientificName.trim().toLowerCase();

    bySci.set(sciKey, {
      ...row,
      nameKo: names.nameKo,
      nameEn: names.nameEn,
      category,
      fishable: true,
    });
  }

  for (const staticRow of getStaticFishingSpecies()) {
    const sciKey = staticRow.scientificName.trim().toLowerCase();
    if (bySci.has(sciKey)) {
      const existing = bySci.get(sciKey)!;
      bySci.set(sciKey, {
        ...existing,
        nameKo: staticRow.nameKo,
        nameEn: staticRow.nameEn ?? existing.nameEn,
        category: staticRow.category,
      });
      continue;
    }

    bySci.set(sciKey, {
      nameKo: staticRow.nameKo,
      nameEn: staticRow.nameEn,
      scientificName: staticRow.scientificName,
      taxonomy: staticRow.taxonomy,
      category: staticRow.category,
      fishable: true,
    });
  }

  return [...bySci.values()];
}
