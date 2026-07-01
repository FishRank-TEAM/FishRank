import { ANGLING_SPECIES_SLUG_SET } from './angling-species-slugs';
import {
  CURATED_SPECIES_SLUGS,
  SPECIES_SLUG_ALIASES,
} from './curated-species-slugs';
import { buildFishableImportRows } from './fishing-species.util';
import { FISH_CATALOG } from './fish-species-catalog';
import type { MofFishSpeciesRow } from './public-data-fish.client';

export type ExportedSpeciesEntry = {
  slug: string;
  speciesId: number;
  nameKo: string;
  nameEn: string;
  scientificName: string;
  category: 'freshwater' | 'saltwater' | 'brackish';
  inaturalistTaxonId: number | null;
  curated: boolean;
  angling: boolean;
};

export type ExportedSpeciesCatalog = {
  version: 1;
  generatedAt: string;
  count: number;
  curatedCount: number;
  anglingCount: number;
  species: ExportedSpeciesEntry[];
  aliases: Record<string, string>;
};

export function scientificNameToSlug(scientificName: string): string {
  const binomial = scientificName.trim().toLowerCase().split(/\s+/).slice(0, 2).join('_');
  return binomial.replace(/[^a-z0-9_]/g, '') || 'unknown_species';
}

function nameEnToSlug(nameEn: string | null | undefined): string | null {
  if (!nameEn?.trim()) return null;
  const slug = nameEn
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || null;
}

function uniqueSlug(
  base: string,
  used: Set<string>,
  scientificName: string,
): string {
  let candidate = base;
  let n = 2;
  while (used.has(candidate)) {
    const suffix = scientificNameToSlug(scientificName).split('_').pop() ?? String(n);
    candidate = `${base}_${suffix}`;
    n += 1;
    if (n > 20) {
      candidate = `${base}_${n}`;
    }
  }
  used.add(candidate);
  return candidate;
}

export function buildExportedSpeciesCatalog(
  mofRows: MofFishSpeciesRow[],
  dbIdByScientificName?: Map<string, number>,
): ExportedSpeciesCatalog {
  const fishableRows = buildFishableImportRows(mofRows);
  const curatedBySci = new Map(
    FISH_CATALOG.filter((e) => e.scientificName).map((e) => [
      e.scientificName.toLowerCase(),
      e,
    ]),
  );

  const usedSlugs = new Set<string>();
  const usedIds = new Set<number>();
  const species: ExportedSpeciesEntry[] = [];

  let nextSyntheticId = 100;

  const allocId = (scientificName: string, preferred?: number): number => {
    const sciKey = scientificName.toLowerCase();
    const fromDb = dbIdByScientificName?.get(sciKey);
    if (fromDb != null && !usedIds.has(fromDb)) {
      usedIds.add(fromDb);
      return fromDb;
    }
    if (preferred != null && !usedIds.has(preferred)) {
      usedIds.add(preferred);
      return preferred;
    }
    while (usedIds.has(nextSyntheticId)) {
      nextSyntheticId += 1;
    }
    const id = nextSyntheticId;
    usedIds.add(id);
    nextSyntheticId += 1;
    return id;
  };

  // 1) 핵심 39종 (카탈로그 순서·ID 고정)
  for (const entry of FISH_CATALOG) {
    if (!entry.scientificName) continue;
    const slug = CURATED_SPECIES_SLUGS[entry.speciesId];
    if (!slug) continue;

    usedSlugs.add(slug);
    usedIds.add(entry.speciesId);

    species.push({
      slug,
      speciesId: entry.speciesId,
      nameKo: entry.nameKo,
      nameEn: entry.nameEn,
      scientificName: entry.scientificName,
      category: entry.category,
      inaturalistTaxonId: entry.iNaturalistTaxonId ?? null,
      curated: true,
      angling: ANGLING_SPECIES_SLUG_SET.has(slug),
    });
  }

  // 2) MOF + 정적 민물·기수 전체
  for (const row of fishableRows) {
    const sciKey = row.scientificName.toLowerCase();
    const curated = curatedBySci.get(sciKey);
    if (curated) continue;

    const slug = uniqueSlug(
      nameEnToSlug(row.nameEn) ?? scientificNameToSlug(row.scientificName),
      usedSlugs,
      row.scientificName,
    );

    species.push({
      slug,
      speciesId: allocId(row.scientificName),
      nameKo: row.nameKo,
      nameEn: row.nameEn ?? row.nameKo,
      scientificName: row.scientificName,
      category: row.category,
      inaturalistTaxonId: null,
      curated: false,
      angling: ANGLING_SPECIES_SLUG_SET.has(slug),
    });
  }

  species.sort((a, b) => {
    if (a.curated !== b.curated) return a.curated ? -1 : 1;
    if (a.speciesId !== b.speciesId) return a.speciesId - b.speciesId;
    return a.nameKo.localeCompare(b.nameKo, 'ko');
  });

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    count: species.length,
    curatedCount: species.filter((s) => s.curated).length,
    anglingCount: species.filter((s) => s.angling).length,
    species,
    aliases: { ...SPECIES_SLUG_ALIASES },
  };
}

export function catalogToSlugMaps(catalog: ExportedSpeciesCatalog): {
  slugToId: Record<string, number>;
  idToSlug: Record<number, string>;
} {
  const slugToId: Record<string, number> = {};
  const idToSlug: Record<number, string> = {};

  for (const entry of catalog.species) {
    slugToId[entry.slug] = entry.speciesId;
    if (!idToSlug[entry.speciesId]) {
      idToSlug[entry.speciesId] = entry.slug;
    }
  }

  for (const [alias, target] of Object.entries(catalog.aliases)) {
    const id = slugToId[target];
    if (id != null) slugToId[alias] = id;
  }

  return { slugToId, idToSlug };
}

export function renderSpeciesSlugGeneratedTs(catalog: ExportedSpeciesCatalog): string {
  const { slugToId, idToSlug } = catalogToSlugMaps(catalog);

  const slugLines = Object.entries(slugToId)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slug, id]) => `  ${JSON.stringify(slug)}: ${id},`)
    .join('\n');

  const idLines = Object.entries(idToSlug)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([id, slug]) => `  ${id}: ${JSON.stringify(slug)},`)
    .join('\n');

  const slugNameKoLines = catalog.species
    .slice()
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map((s) => `  ${JSON.stringify(s.slug)}: ${JSON.stringify(s.nameKo)},`)
    .join('\n');

  return `/** AUTO-GENERATED by export-ai-species-catalog.ts — do not edit */
export const SPECIES_CATALOG_META = {
  count: ${catalog.count},
  curatedCount: ${catalog.curatedCount},
  generatedAt: ${JSON.stringify(catalog.generatedAt)},
} as const;

export const SPECIES_SLUG_TO_ID: Record<string, number> = {
${slugLines}
};

export const SPECIES_ID_TO_SLUG: Record<number, string> = {
${idLines}
};

export const SPECIES_SLUG_TO_NAME_KO: Record<string, string> = {
${slugNameKoLines}
};
`;
}
