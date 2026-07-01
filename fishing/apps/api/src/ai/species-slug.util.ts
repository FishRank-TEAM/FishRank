/** AI slug → DB fish_species.id (species-slug.generated.ts 자동 생성) */
import {
  SPECIES_CATALOG_META,
  SPECIES_ID_TO_SLUG,
  SPECIES_SLUG_TO_ID,
  SPECIES_SLUG_TO_NAME_KO,
} from './species-slug.generated';

export { SPECIES_CATALOG_META, SPECIES_ID_TO_SLUG, SPECIES_SLUG_TO_ID, SPECIES_SLUG_TO_NAME_KO };

export function resolveSpeciesId(slug: string): number | null {
  return SPECIES_SLUG_TO_ID[slug] ?? null;
}

export function resolveSpeciesSlug(speciesId: number): string | null {
  return SPECIES_ID_TO_SLUG[speciesId] ?? null;
}

export function resolveSpeciesNameKo(slug: string): string {
  return SPECIES_SLUG_TO_NAME_KO[slug] ?? slug;
}
