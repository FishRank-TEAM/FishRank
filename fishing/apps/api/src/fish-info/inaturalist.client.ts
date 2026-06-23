import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import type { FishCatalogEntry } from './fish-species-catalog';

const INAT_BASE = 'https://api.inaturalist.org/v1';
const KOREA_PLACE_ID = 6792;

export type InaturalistTaxonSummary = {
  taxonId: number;
  scientificName: string;
  rank: string;
  nameKo: string | null;
  nameEn: string | null;
  wikipediaUrl: string | null;
  imageUrl: string | null;
  imageAttribution: string | null;
  observationsCount: number;
  observationsCountKorea: number;
  iconicTaxon: string | null;
  matchType: 'taxon_id' | 'exact_scientific' | 'fallback';
};

@Injectable()
export class InaturalistClient {
  private readonly logger = new Logger(InaturalistClient.name);
  private readonly imageCache = new Map<string, { url: string | null; attribution: string | null }>();

  /** 목록·상세용 빠른 사진 조회 (메모리 캐시) */
  async getImageQuick(
    scientificName?: string,
    nameKo?: string,
    catalog?: FishCatalogEntry,
  ): Promise<{ url: string | null; attribution: string | null } | null> {
    const cacheKey = (scientificName ?? nameKo ?? '').trim().toLowerCase();
    if (!cacheKey) return null;

    const cached = this.imageCache.get(cacheKey);
    if (cached !== undefined) return cached;

    let taxon: InaturalistTaxonSummary | null = null;
    if (catalog) {
      taxon = await this.resolveFromCatalog(catalog);
    } else if (scientificName) {
      taxon = await this.searchExactScientific(scientificName);
    } else if (nameKo) {
      taxon = await this.searchTaxon(nameKo);
    }

    const result = {
      url: taxon?.imageUrl ?? null,
      attribution: taxon?.imageAttribution ?? null,
    };
    this.imageCache.set(cacheKey, result);
    return result;
  }

  /** 카탈로그 항목 기준 정확 매칭 (autocomplete 사용 안 함) */
  async resolveFromCatalog(entry: FishCatalogEntry): Promise<InaturalistTaxonSummary | null> {
    if (!entry.scientificName) return null;

    if (entry.iNaturalistTaxonId) {
      const byId = await this.getTaxon(entry.iNaturalistTaxonId);
      if (byId && this.isScientificMatch(byId.scientificName, entry.scientificName)) {
        return { ...byId, matchType: 'taxon_id' };
      }
      this.logger.warn(
        `iNaturalist taxonId ${entry.iNaturalistTaxonId} mismatch for ${entry.nameKo}, fallback to scientific search`,
      );
    }

    const exact = await this.searchExactScientific(entry.scientificName);
    if (exact) {
      return { ...exact, matchType: 'exact_scientific' };
    }

    this.logger.warn(`iNaturalist no exact match: ${entry.nameKo} (${entry.scientificName})`);
    return null;
  }

  async searchTaxon(query: string): Promise<InaturalistTaxonSummary | null> {
    if (this.looksLikeScientificName(query)) {
      const exact = await this.searchExactScientific(query);
      if (exact) return exact;
    }

    const res = await axios.get(`${INAT_BASE}/taxa`, {
      params: { q: query, rank: 'species', per_page: 10, locale: 'ko' },
      timeout: 12000,
    });

    const results = (res.data?.results ?? []) as Record<string, unknown>[];
    const species = results.find((r) => r.rank === 'species') ?? results[0];
    if (!species) return null;

    const mapped = await this.mapTaxon(species);
    return { ...mapped, matchType: 'fallback' };
  }

  async getTaxon(taxonId: number): Promise<InaturalistTaxonSummary | null> {
    const res = await axios.get(`${INAT_BASE}/taxa/${taxonId}`, {
      params: { locale: 'ko' },
      timeout: 12000,
    });
    const taxon = res.data?.results?.[0] as Record<string, unknown> | undefined;
    if (!taxon) return null;
    const mapped = await this.mapTaxon(taxon);
    return { ...mapped, matchType: 'taxon_id' };
  }

  private async searchExactScientific(scientificName: string): Promise<InaturalistTaxonSummary | null> {
    const res = await axios.get(`${INAT_BASE}/taxa`, {
      params: { q: scientificName, rank: 'species', per_page: 30, locale: 'ko' },
      timeout: 12000,
    });

    const results = (res.data?.results ?? []) as Record<string, unknown>[];
    const exact = results.find(
      (r) => r.rank === 'species' && this.isScientificMatch(String(r.name ?? ''), scientificName),
    );

    if (!exact) return null;
    const mapped = await this.mapTaxon(exact);
    return { ...mapped, matchType: 'exact_scientific' };
  }

  private isScientificMatch(found: string, expected: string): boolean {
    return found.trim().toLowerCase() === expected.trim().toLowerCase();
  }

  private looksLikeScientificName(q: string): boolean {
    return /^[A-Z][a-z]+ [a-z]+/.test(q.trim());
  }

  async getKoreaObservationCount(taxonId: number): Promise<number> {
    try {
      const res = await axios.get(`${INAT_BASE}/observations`, {
        params: { taxon_id: taxonId, place_id: KOREA_PLACE_ID, per_page: 0 },
        timeout: 10000,
      });
      return Number(res.data?.total_results ?? 0);
    } catch {
      return 0;
    }
  }

  private async mapTaxon(raw: Record<string, unknown>): Promise<InaturalistTaxonSummary> {
    const taxonId = Number(raw.id);
    const defaultPhoto = raw.default_photo as Record<string, unknown> | null | undefined;
    const koreaCount = Number.isFinite(taxonId)
      ? await this.getKoreaObservationCount(taxonId)
      : 0;

    return {
      taxonId,
      scientificName: String(raw.name ?? ''),
      rank: String(raw.rank ?? ''),
      nameKo:
        (raw.preferred_common_name as string | undefined) ??
        (raw.matched_term as string | undefined) ??
        null,
      nameEn: (raw.english_common_name as string | undefined) ?? null,
      wikipediaUrl: (raw.wikipedia_url as string | undefined) ?? null,
      imageUrl:
        (defaultPhoto?.medium_url as string | undefined) ??
        (defaultPhoto?.square_url as string | undefined) ??
        null,
      imageAttribution: (defaultPhoto?.attribution as string | undefined) ?? null,
      observationsCount: Number(raw.observations_count ?? 0),
      observationsCountKorea: koreaCount,
      iconicTaxon: (raw.iconic_taxon_name as string | undefined) ?? null,
      matchType: 'fallback',
    };
  }
}
