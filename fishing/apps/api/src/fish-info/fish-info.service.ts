import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ALL_FISH_CATALOG,
  FISH_CATALOG,
  FISH_CATALOG_STATS,
  getCatalogEntry,
  type FishCatalogEntry,
} from './fish-species-catalog';
import { buildFishableImportRows } from './fishing-species.util';
import { InaturalistClient, type InaturalistTaxonSummary } from './inaturalist.client';
import { PublicDataFishClient, type PublicFishRecord } from './public-data-fish.client';

const SYNC_DELAY_MS = 400;

export type EnrichedFishInfo = {
  speciesId: number;
  nameKo: string;
  nameEn: string | null;
  scientificName: string | null;
  category: string;
  description: string;
  habitat: string | null;
  season: string | null;
  bait: string | null;
  technique: string | null;
  avgLengthCm: number | null;
  maxLengthCm: number | null;
  minSizeLaw: number | null;
  imageUrl: string | null;
  imageAttribution: string | null;
  wikipediaUrl: string | null;
  iNaturalist: InaturalistTaxonSummary | null;
  publicData: PublicFishRecord | null;
  sources: string[];
  catalogMatch: boolean;
};

export type SyncResultItem = {
  speciesId: number;
  nameKo: string;
  ok: boolean;
  iNaturalist?: string;
  publicData?: string;
  error?: string;
};

export type ImportResult = {
  total: number;
  created: number;
  updated: number;
  pruned: number;
  dbCount: number;
  freshwater: number;
  saltwater: number;
  brackish: number;
};

@Injectable()
export class FishInfoService {
  private readonly logger = new Logger(FishInfoService.name);

  constructor(
    private prisma: PrismaService,
    private inaturalist: InaturalistClient,
    private publicData: PublicDataFishClient,
  ) {}

  getCatalog() {
    return {
      stats: FISH_CATALOG_STATS,
      freshwater: FISH_CATALOG.filter((s) => s.category === 'freshwater'),
      saltwater: FISH_CATALOG.filter((s) => s.category === 'saltwater'),
      brackish: FISH_CATALOG.filter((s) => s.category === 'brackish'),
    };
  }

  async searchExternal(query: string) {
    const catalog = FISH_CATALOG.find(
      (s) => s.nameKo === query || s.nameEn.toLowerCase() === query.toLowerCase(),
    );

    const [inat, publicRecord] = await Promise.all([
      catalog
        ? this.inaturalist.resolveFromCatalog(catalog)
        : this.inaturalist.searchTaxon(query),
      catalog
        ? this.publicData.searchByCategory(
            catalog.publicDataQuery,
            catalog.category,
            catalog.scientificName,
          )
        : this.publicData.searchByCategory(query, 'saltwater'),
    ]);

    return { query, catalog: catalog ?? null, iNaturalist: inat, publicData: publicRecord };
  }

  async getEnriched(speciesId: number): Promise<EnrichedFishInfo> {
    await this.ensureCatalogRegistered();

    const species = await this.prisma.fishSpecies.findUnique({
      where: { id: speciesId },
      include: { encyclopedia: true },
    });

    if (!species) throw new NotFoundException('어종을 찾을 수 없습니다');

    const catalog = getCatalogEntry(speciesId);
    return this.buildEnriched(species, catalog);
  }

  async syncSpecies(speciesId: number): Promise<EnrichedFishInfo> {
    const catalog = getCatalogEntry(speciesId);
    if (!catalog || !catalog.scientificName) {
      throw new NotFoundException('동기화 카탈로그에 없는 어종입니다');
    }

    await this.registerOneSpecies(catalog);

    const enriched = await this.buildEnriched(
      await this.prisma.fishSpecies.findUniqueOrThrow({
        where: { id: speciesId },
        include: { encyclopedia: true },
      }),
      catalog,
    );

    await this.prisma.fishSpecies.update({
      where: { id: speciesId },
      data: {
        nameKo: catalog.nameKo,
        nameEn: enriched.nameEn ?? catalog.nameEn,
        category: catalog.category === 'brackish' ? 'saltwater' : catalog.category,
        rarityWeight: catalog.rarityWeight,
        imageUrl: enriched.imageUrl,
      },
    });

    await this.prisma.fishEncyclopedia.upsert({
      where: { fishSpeciesId: speciesId },
      update: {
        description: enriched.description,
        habitat: enriched.habitat,
        season: enriched.season,
        bait: enriched.bait,
        technique: enriched.technique,
        avgLengthCm: enriched.avgLengthCm,
        maxLengthCm: enriched.maxLengthCm,
        minSizeLaw: enriched.minSizeLaw,
        imageUrl: enriched.imageUrl,
      },
      create: {
        fishSpeciesId: speciesId,
        description: enriched.description,
        habitat: enriched.habitat,
        season: enriched.season,
        bait: enriched.bait,
        technique: enriched.technique,
        avgLengthCm: enriched.avgLengthCm,
        maxLengthCm: enriched.maxLengthCm,
        minSizeLaw: enriched.minSizeLaw,
        imageUrl: enriched.imageUrl,
      },
    });

    return enriched;
  }

  async syncAll(): Promise<SyncResultItem[]> {
    const imported = await this.importPublicFishSpecies();
    this.logger.log(
      `공공데이터 어류 ${imported.total}종 반영 (신규 ${imported.created}, 갱신 ${imported.updated}, DB ${imported.dbCount}종)`,
    );

    await this.ensureCatalogRegistered();

    const results: SyncResultItem[] = [];

    for (const entry of FISH_CATALOG) {
      try {
        const enriched = await this.syncSpecies(entry.speciesId);
        results.push({
          speciesId: entry.speciesId,
          nameKo: entry.nameKo,
          ok: true,
          iNaturalist: enriched.iNaturalist
            ? `${enriched.iNaturalist.scientificName} (${enriched.iNaturalist.matchType})`
            : '없음',
          publicData: enriched.publicData?.matched
            ? `${enriched.publicData.source} ✓`
            : enriched.publicData
              ? `${enriched.publicData.source} (검증 미통과)`
              : '없음',
        });
      } catch (err) {
        results.push({
          speciesId: entry.speciesId,
          nameKo: entry.nameKo,
          ok: false,
          error: err instanceof Error ? err.message : 'unknown',
        });
      }

      await this.delay(SYNC_DELAY_MS);
    }

    const ok = results.filter((r) => r.ok).length;
    this.logger.log(`어종 동기화 완료: ${ok}/${results.length}`);
    return results;
  }

  /** 해양수산부 + 국내 낚시 어종 DB 반영 (낚시 대상만) */
  async importPublicFishSpecies(): Promise<ImportResult> {
    await this.ensureCatalogRegistered();
    await this.resetFishSpeciesIdSequence();

    const mofRows = await this.publicData.fetchAllMofFishSpecies();
    const rows = buildFishableImportRows(mofRows);
    const keptScientificNames = rows.map((r) => r.scientificName);
    let created = 0;
    let updated = 0;

    const curatedBySci = new Map(
      FISH_CATALOG.filter((e) => e.scientificName).map((e) => [
        e.scientificName.toLowerCase(),
        e,
      ]),
    );

    const curatedIds = new Set(ALL_FISH_CATALOG.map((e) => e.speciesId));

    for (const row of rows) {
      const curated = curatedBySci.get(row.scientificName.toLowerCase());
      const category =
        curated?.category === 'brackish'
          ? 'saltwater'
          : curated?.category ?? (row.category === 'brackish' ? 'saltwater' : row.category);
      const description = this.buildPublicDescription(row);

      if (curated) {
        await this.prisma.fishSpecies.update({
          where: { id: curated.speciesId },
          data: {
            nameKo: curated.nameKo,
            nameEn: curated.nameEn,
            scientificName: row.scientificName,
            category,
          },
        });
        await this.upsertPublicEncyclopedia(curated.speciesId, description, curated);
        updated += 1;
        continue;
      }

      const existing = await this.prisma.fishSpecies.findUnique({
        where: { scientificName: row.scientificName },
      });

      if (existing) {
        await this.prisma.fishSpecies.update({
          where: { id: existing.id },
          data: {
            nameKo: row.nameKo,
            nameEn: row.nameEn ?? existing.nameEn,
            category,
          },
        });
        await this.upsertPublicEncyclopedia(existing.id, description);
        updated += 1;
        continue;
      }

      const species = await this.prisma.fishSpecies.create({
        data: {
          nameKo: row.nameKo,
          nameEn: row.nameEn,
          scientificName: row.scientificName,
          category,
          rarityWeight: 1.0,
        },
      });
      await this.upsertPublicEncyclopedia(species.id, description);
      created += 1;
    }

    const pruned = await this.pruneBulkNonFishingSpecies(keptScientificNames, curatedIds);

    const [dbCount, freshwater, saltwater, brackish] = await Promise.all([
      this.prisma.fishEncyclopedia.count(),
      this.prisma.fishEncyclopedia.count({ where: { fishSpecies: { category: 'freshwater' } } }),
      this.prisma.fishEncyclopedia.count({ where: { fishSpecies: { category: 'saltwater' } } }),
      this.prisma.fishSpecies.count({ where: { category: 'brackish' } }),
    ]);

    return { total: rows.length, created, updated, pruned, dbCount, freshwater, saltwater, brackish };
  }

  /** 이전 bulk import 잔여(낚시 비대상) 제거 — 핵심 카탈로그 ID는 유지 */
  private async pruneBulkNonFishingSpecies(
    keptScientificNames: string[],
    curatedIds: Set<number>,
  ): Promise<number> {
    const stale = await this.prisma.fishSpecies.findMany({
      where: {
        id: { gt: 99 },
        NOT: curatedIds.size ? { id: { in: [...curatedIds] } } : undefined,
        OR: [
          { scientificName: null },
          { scientificName: { notIn: keptScientificNames } },
        ],
        catches: { none: {} },
      },
      select: { id: true },
    });

    if (!stale.length) return 0;

    const ids = stale.map((s) => s.id);
    await this.prisma.fishEncyclopedia.deleteMany({ where: { fishSpeciesId: { in: ids } } });
    await this.prisma.fishSpecies.deleteMany({ where: { id: { in: ids } } });
    return ids.length;
  }

  async getDbStats() {
    const [speciesCount, encyclopediaCount, featuredCount] = await Promise.all([
      this.prisma.fishSpecies.count(),
      this.prisma.fishEncyclopedia.count(),
      this.prisma.fishSpecies.count({ where: { id: { lte: 100 } } }),
    ]);
    return { speciesCount, encyclopediaCount, featuredCatalog: FISH_CATALOG.length, featuredCount };
  }

  async ensureCatalogRegistered() {
    for (const entry of ALL_FISH_CATALOG) {
      await this.registerOneSpecies(entry);
    }
  }

  private async registerOneSpecies(entry: FishCatalogEntry) {
    const category = entry.category === 'brackish' ? 'saltwater' : entry.category;
    const scientificName = entry.scientificName || null;

    await this.prisma.fishSpecies.upsert({
      where: { id: entry.speciesId },
      update: {
        nameKo: entry.nameKo,
        nameEn: entry.nameEn,
        scientificName,
        category,
        rarityWeight: entry.rarityWeight,
      },
      create: {
        id: entry.speciesId,
        nameKo: entry.nameKo,
        nameEn: entry.nameEn,
        scientificName,
        category,
        rarityWeight: entry.rarityWeight,
      },
    });
  }

  private async upsertPublicEncyclopedia(
    speciesId: number,
    description: string,
    curated?: FishCatalogEntry,
  ) {
    const existing = await this.prisma.fishEncyclopedia.findUnique({
      where: { fishSpeciesId: speciesId },
    });

    if (existing?.season && curated) return;

    if (existing) {
      await this.prisma.fishEncyclopedia.update({
        where: { fishSpeciesId: speciesId },
        data: { description },
      });
      return;
    }

    await this.prisma.fishEncyclopedia.create({
      data: {
        fishSpeciesId: speciesId,
        description,
        season: curated?.season ?? null,
        bait: curated?.bait ?? null,
        technique: curated?.technique ?? null,
        avgLengthCm: curated?.avgLengthCm ?? null,
        maxLengthCm: curated?.maxLengthCm ?? null,
        minSizeLaw: curated?.minSizeLaw ?? null,
      },
    });
  }

  private buildPublicDescription(row: {
    nameKo: string;
    nameEn: string | null;
    scientificName: string;
    taxonomy: string | null;
  }): string {
    const parts = [
      row.nameEn ? `${row.nameKo}(${row.nameEn})` : row.nameKo,
      `학명: ${row.scientificName}`,
    ];
    if (row.taxonomy) parts.push(`분류: ${row.taxonomy}`);
    parts.push('출처: 해양수산부 해양생물종기본정보');
    return parts.join('\n\n');
  }

  private async buildEnriched(
    species: {
      id: number;
      nameKo: string;
      nameEn: string | null;
      scientificName: string | null;
      category: string;
      encyclopedia: {
        description: string;
        habitat: string | null;
        season: string | null;
        bait: string | null;
        technique: string | null;
        avgLengthCm: number | null;
        maxLengthCm: number | null;
        minSizeLaw: number | null;
        imageUrl: string | null;
      } | null;
    },
    catalog?: FishCatalogEntry,
  ): Promise<EnrichedFishInfo> {
    const scientificName =
      catalog?.scientificName ?? species.scientificName ?? undefined;
    const category = (catalog?.category ?? species.category) as FishCatalogEntry['category'];
    const publicCategory =
      category === 'brackish' ? 'brackish' : category === 'freshwater' ? 'freshwater' : 'saltwater';

    const [inat, publicRecord] = await Promise.all([
      catalog
        ? this.inaturalist.resolveFromCatalog(catalog)
        : scientificName
          ? this.inaturalist.searchTaxon(scientificName)
          : this.inaturalist.searchTaxon(species.nameKo),
      this.publicData.searchByCategory(
        catalog?.publicDataQuery ?? species.nameKo,
        publicCategory,
        scientificName,
      ),
    ]);

    const enc = species.encyclopedia;
    const sources: string[] = [];
    if (inat) sources.push('iNaturalist');
    if (publicRecord) sources.push(this.publicDataSourceLabel(publicRecord.source));

    const description = this.composeDescription(
      catalog,
      inat,
      publicRecord,
      enc?.description,
      species.nameKo,
    );

    return {
      speciesId: species.id,
      nameKo: catalog?.nameKo ?? species.nameKo,
      nameEn: inat?.nameEn ?? catalog?.nameEn ?? species.nameEn ?? publicRecord?.nameEn ?? null,
      scientificName:
        inat?.scientificName ?? catalog?.scientificName ?? species.scientificName ?? publicRecord?.scientificName ?? null,
      category: catalog?.category ?? species.category,
      description,
      habitat:
        publicRecord?.habitat ??
        publicRecord?.distribution ??
        enc?.habitat ??
        null,
      season: enc?.season ?? catalog?.season ?? null,
      bait: enc?.bait ?? catalog?.bait ?? null,
      technique: enc?.technique ?? catalog?.technique ?? null,
      avgLengthCm: enc?.avgLengthCm ?? catalog?.avgLengthCm ?? null,
      maxLengthCm: enc?.maxLengthCm ?? catalog?.maxLengthCm ?? null,
      minSizeLaw: enc?.minSizeLaw ?? catalog?.minSizeLaw ?? null,
      imageUrl: inat?.imageUrl ?? enc?.imageUrl ?? null,
      imageAttribution: inat?.imageAttribution ?? null,
      wikipediaUrl: inat?.wikipediaUrl ?? null,
      iNaturalist: inat,
      publicData: publicRecord,
      sources,
      catalogMatch: !!catalog,
    };
  }

  private composeDescription(
    catalog: FishCatalogEntry | undefined,
    inat: InaturalistTaxonSummary | null,
    publicRecord: PublicFishRecord | null,
    existing?: string,
    fallbackNameKo?: string,
  ): string {
    const parts: string[] = [];

    if (catalog) {
      parts.push(`${catalog.nameKo}(${catalog.nameEn}) — 국내 낚시 대상 ${catalog.category === 'freshwater' ? '민물' : catalog.category === 'brackish' ? '기수' : '바다'} 어종`);
    } else if (fallbackNameKo) {
      parts.push(`${fallbackNameKo} — 대한민국 수산·해양 생물종`);
    }

    if (publicRecord?.taxonomy) parts.push(`분류: ${publicRecord.taxonomy}`);
    else if (inat?.scientificName) parts.push(`학명: ${inat.scientificName}`);

    if (publicRecord?.ecology) parts.push(publicRecord.ecology);
    if (publicRecord?.morphology) parts.push(publicRecord.morphology);
    if (publicRecord?.distribution) parts.push(`국내 분포: ${publicRecord.distribution}`);

    if (inat?.observationsCountKorea) {
      parts.push(
        `대한민국 iNaturalist 관찰 ${inat.observationsCountKorea.toLocaleString()}건 (전 세계 ${inat.observationsCount.toLocaleString()}건)`,
      );
    }

    if (!parts.length && existing) parts.push(existing);
    if (!parts.length && catalog) {
      parts.push(`${catalog.nameKo}에 대한 FishRank 어종 정보입니다.`);
    }

    parts.push(`출처: iNaturalist${publicRecord ? ` · ${this.publicDataSourceLabel(publicRecord.source)}` : ''}`);
    return parts.join('\n\n');
  }

  private publicDataSourceLabel(source: PublicFishRecord['source']): string {
    switch (source) {
      case 'nifs':
        return '국립수산과학원';
      case 'nakdong':
        return '국립낙동강생물자원관';
      case 'mbris':
        return 'MBRIS 해양생물종';
      case 'mof':
        return '해양수산부';
      default:
        return '공공데이터포털';
    }
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** 시드가 id 1~99를 수동 지정해 둔 뒤 autoincrement 시퀀스가 뒤처지는 문제 보정 */
  private async resetFishSpeciesIdSequence() {
    await this.prisma.$executeRaw`
      SELECT setval(
        pg_get_serial_sequence('fish_species', 'id'),
        COALESCE((SELECT MAX(id) FROM fish_species), 1)
      )
    `;
  }
}
