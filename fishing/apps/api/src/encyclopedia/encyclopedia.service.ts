import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getCatalogEntry, type FishCatalogEntry } from '../fish-info/fish-species-catalog';
import { FishNewsClient } from './fish-news.client';
import type { CreateEncyclopediaTipDto } from './dto/create-encyclopedia-tip.dto';
import {
  buildEncyclopediaChanges,
  type EncyclopediaEditField,
} from './encyclopedia-edit.util';
import { isGenericSummary, mergeBasicInfoWithTips } from './encyclopedia-merge.util';
import {
  buildTechniqueSpeciesOr,
  isEncyclopediaSort,
  isEncyclopediaTechnique,
  type EncyclopediaSort,
  type EncyclopediaTechnique,
} from './encyclopedia-filter.util';

const DATA_SOURCE = '해양수산부 해양생물종기본정보 · 공공데이터포털';

@Injectable()
export class EncyclopediaService {
  constructor(
    private prisma: PrismaService,
    private news: FishNewsClient,
  ) {}

  async list(
    category?: string,
    search?: string,
    page = 1,
    limit = 48,
    sort: EncyclopediaSort = 'name',
    technique: EncyclopediaTechnique = 'all',
  ) {
    const pageNum = Math.max(1, page);
    const take = Math.min(100, Math.max(1, limit));
    const skip = (pageNum - 1) * take;

    const speciesAnd: Record<string, unknown>[] = [];
    if (category && category !== 'all') speciesAnd.push({ category });
    if (search?.trim()) {
      speciesAnd.push({
        OR: [
          { nameKo: { contains: search.trim(), mode: 'insensitive' } },
          { nameEn: { contains: search.trim(), mode: 'insensitive' } },
          { scientificName: { contains: search.trim(), mode: 'insensitive' } },
        ],
      });
    }

    const techniqueOr = buildTechniqueSpeciesOr(technique);
    if (techniqueOr) {
      if (techniqueOr.length === 0) {
        return {
          items: [],
          total: 0,
          page: pageNum,
          limit: take,
          totalPages: 1,
        };
      }
      speciesAnd.push({ OR: techniqueOr });
    }

    const speciesWhere = speciesAnd.length > 0 ? { AND: speciesAnd } : {};
    const where = Object.keys(speciesWhere).length > 0 ? { fishSpecies: speciesWhere } : {};

    const orderBy =
      sort === 'popular'
        ? [
            { fishSpecies: { catches: { _count: 'desc' as const } } },
            { fishSpecies: { nameKo: 'asc' as const } },
          ]
        : [{ fishSpecies: { nameKo: 'asc' as const } }];

    const [rows, total] = await Promise.all([
      this.prisma.fishEncyclopedia.findMany({
        where,
        include: { fishSpecies: true },
        orderBy,
        skip,
        take,
      }),
      this.prisma.fishEncyclopedia.count({ where }),
    ]);

    const items = await this.attachListImages(rows);

    return {
      items,
      total,
      page: pageNum,
      limit: take,
      totalPages: Math.max(1, Math.ceil(total / take)),
    };
  }

  async getStats() {
    const [total, freshwater, saltwater] = await Promise.all([
      this.prisma.fishEncyclopedia.count(),
      this.prisma.fishEncyclopedia.count({ where: { fishSpecies: { category: 'freshwater' } } }),
      this.prisma.fishEncyclopedia.count({ where: { fishSpecies: { category: 'saltwater' } } }),
    ]);
    return { total, freshwater, saltwater };
  }

  /** DB·카탈로그만 사용 — 외부 API 호출 없음 (빠른 응답) */
  async getDetail(speciesId: number) {
    const species = await this.prisma.fishSpecies.findUnique({
      where: { id: speciesId },
      include: {
        encyclopedia: true,
        tips: {
          include: { user: { select: { nickname: true } } },
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
      },
    });

    if (!species) throw new NotFoundException('어종을 찾을 수 없습니다');

    const catalog = getCatalogEntry(speciesId);
    const enc = species.encyclopedia;
    const nameKo = catalog?.nameKo ?? species.nameKo;

    const officialSummary = this.buildSummaryLocal(
      nameKo,
      enc?.description,
      species.category,
      catalog,
    );
    const summaryOfficial =
      officialSummary && !isGenericSummary(officialSummary, nameKo) ? officialSummary : null;

    const official = {
      imageUrl: species.imageUrl ?? enc?.imageUrl ?? null,
      season: enc?.season ?? catalog?.season ?? null,
      bait: enc?.bait ?? catalog?.bait ?? null,
      technique: enc?.technique ?? catalog?.technique ?? null,
      habitat: enc?.habitat ?? this.extractHabitatFromDescription(enc?.description),
      summary: summaryOfficial,
      avgLengthCm: enc?.avgLengthCm ?? catalog?.avgLengthCm ?? null,
    };

    const merged = mergeBasicInfoWithTips(
      official,
      species.tips.map((t) => ({
        season: t.season,
        bait: t.bait,
        technique: t.technique,
        habitat: t.habitat,
        note: t.note,
        summary: t.summary,
        imageUrl: t.imageUrl,
      })),
    );

    return {
      speciesId: species.id,
      nameKo,
      nameEn: species.nameEn,
      scientificName: species.scientificName,
      category: species.category,
      imageUrl: merged.imageUrl,
      imageAttribution: merged.filledByCommunity.imageUrl ? '낚시인 제공' : null,
      season: merged.season,
      bait: merged.bait,
      technique: merged.technique,
      habitat: merged.habitat,
      distribution: null,
      summary: merged.summary,
      minSizeLaw: enc?.minSizeLaw ?? catalog?.minSizeLaw ?? null,
      avgLengthCm: merged.avgLengthCm,
      filledByCommunity: merged.filledByCommunity,
      needsFill: merged.needsFill,
      communityTips: species.tips.map((t) => this.mapTip(t)),
      editLogs: await this.getEditLogs(speciesId),
      dataSource: DATA_SOURCE,
    };
  }

  async getEditLogs(speciesId: number) {
    const exists = await this.prisma.fishSpecies.findUnique({ where: { id: speciesId } });
    if (!exists) throw new NotFoundException('어종을 찾을 수 없습니다');

    const logs = await this.prisma.fishEncyclopediaEditLog.findMany({
      where: { fishSpeciesId: speciesId },
      include: { user: { select: { nickname: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      nickname: log.user.nickname,
      changes: log.changes,
      createdAt: log.createdAt,
    }));
  }

  async getTips(speciesId: number) {
    const exists = await this.prisma.fishSpecies.findUnique({ where: { id: speciesId } });
    if (!exists) throw new NotFoundException('어종을 찾을 수 없습니다');

    const tips = await this.prisma.fishEncyclopediaTip.findMany({
      where: { fishSpeciesId: speciesId },
      include: { user: { select: { nickname: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return tips.map((t) => this.mapTip(t));
  }

  private mapTip(t: {
    id: string;
    userId: string;
    season: string | null;
    bait: string | null;
    technique: string | null;
    habitat: string | null;
    note: string | null;
    summary: string | null;
    imageUrl: string | null;
    createdAt: Date;
    user: { nickname: string };
  }) {
    return {
      id: t.id,
      userId: t.userId,
      nickname: t.user.nickname,
      season: t.season,
      bait: t.bait,
      technique: t.technique,
      habitat: t.habitat,
      note: t.note,
      summary: t.summary,
      imageUrl: t.imageUrl,
      createdAt: t.createdAt,
    };
  }

  async getNews(speciesId: number) {
    const species = await this.prisma.fishSpecies.findUnique({ where: { id: speciesId } });
    if (!species) throw new NotFoundException('어종을 찾을 수 없습니다');
    const catalog = getCatalogEntry(speciesId);
    return this.news.searchArticles(catalog?.nameKo ?? species.nameKo);
  }

  async createTip(
    speciesId: number,
    userId: string,
    dto: CreateEncyclopediaTipDto,
    imageUrl?: string | null,
  ) {
    const species = await this.prisma.fishSpecies.findUnique({
      where: { id: speciesId },
      include: {
        encyclopedia: true,
        tips: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!species) throw new NotFoundException('어종을 찾을 수 없습니다');

    const catalog = getCatalogEntry(speciesId);
    const nameKo = catalog?.nameKo ?? species.nameKo;
    const enc = species.encyclopedia;
    const officialSummary = this.buildSummaryLocal(
      nameKo,
      enc?.description,
      species.category,
      catalog,
    );
    const summaryOfficial =
      officialSummary && !isGenericSummary(officialSummary, nameKo) ? officialSummary : null;

    const official = {
      imageUrl: species.imageUrl ?? enc?.imageUrl ?? null,
      season: enc?.season ?? catalog?.season ?? null,
      bait: enc?.bait ?? catalog?.bait ?? null,
      technique: enc?.technique ?? catalog?.technique ?? null,
      habitat: enc?.habitat ?? this.extractHabitatFromDescription(enc?.description),
      summary: summaryOfficial,
      avgLengthCm: enc?.avgLengthCm ?? catalog?.avgLengthCm ?? null,
    };

    const merged = mergeBasicInfoWithTips(
      official,
      species.tips.map((t) => ({
        season: t.season,
        bait: t.bait,
        technique: t.technique,
        habitat: t.habitat,
        note: t.note,
        summary: t.summary,
        imageUrl: t.imageUrl,
      })),
    );

    const afterValues: Record<EncyclopediaEditField, string | null> = {
      season: dto.season?.trim() || merged.season,
      bait: dto.bait?.trim() || merged.bait,
      technique: dto.technique?.trim() || merged.technique,
      habitat: dto.habitat?.trim() || merged.habitat,
      summary: dto.summary?.trim() || merged.summary,
      imageUrl: imageUrl ?? merged.imageUrl,
    };

    const beforeValues: Record<EncyclopediaEditField, string | null> = {
      season: merged.season,
      bait: merged.bait,
      technique: merged.technique,
      habitat: merged.habitat,
      summary: merged.summary,
      imageUrl: merged.imageUrl,
    };

    const changes = buildEncyclopediaChanges(beforeValues, afterValues);
    if (changes.length === 0) {
      throw new BadRequestException('변경된 내용이 없습니다.');
    }

    const tip = await this.prisma.fishEncyclopediaTip.create({
      data: {
        fishSpeciesId: speciesId,
        userId,
        season: afterValues.season,
        bait: afterValues.bait,
        technique: afterValues.technique,
        habitat: afterValues.habitat,
        note: dto.note?.trim() || null,
        summary: afterValues.summary,
        imageUrl: afterValues.imageUrl,
      },
      include: { user: { select: { nickname: true } } },
    });

    await this.prisma.fishEncyclopediaEditLog.create({
      data: {
        fishSpeciesId: speciesId,
        userId,
        changes,
      },
    });

    if (afterValues.imageUrl && afterValues.imageUrl !== beforeValues.imageUrl) {
      await this.maybePromoteSpeciesImage(speciesId, afterValues.imageUrl);
    }

    return this.mapTip(tip);
  }

  async deleteTip(speciesId: number, tipId: string, userId: string) {
    const tip = await this.prisma.fishEncyclopediaTip.findFirst({
      where: { id: tipId, fishSpeciesId: speciesId },
    });

    if (!tip) throw new NotFoundException('기여 정보를 찾을 수 없습니다');
    if (tip.userId !== userId) throw new ForbiddenException('본인이 올린 정보만 삭제할 수 있어요');

    await this.prisma.fishEncyclopediaTip.delete({ where: { id: tipId } });

    if (tip.imageUrl) {
      const species = await this.prisma.fishSpecies.findUnique({
        where: { id: speciesId },
        include: { encyclopedia: true },
      });
      if (species?.imageUrl === tip.imageUrl) {
        await this.refreshSpeciesImageFromTips(speciesId);
      }
    }
  }

  private async maybePromoteSpeciesImage(speciesId: number, imageUrl: string) {
    const species = await this.prisma.fishSpecies.findUnique({
      where: { id: speciesId },
      include: { encyclopedia: true },
    });
    if (!species) return;

    const catalog = getCatalogEntry(speciesId);
    const hasOfficialImage = !!(species.imageUrl ?? species.encyclopedia?.imageUrl);
    if (hasOfficialImage) return;

    await this.prisma.fishSpecies.update({
      where: { id: speciesId },
      data: { imageUrl },
    });
    if (species.encyclopedia) {
      await this.prisma.fishEncyclopedia.update({
        where: { fishSpeciesId: speciesId },
        data: { imageUrl },
      });
    }
  }

  private async refreshSpeciesImageFromTips(speciesId: number) {
    const next = await this.prisma.fishEncyclopediaTip.findFirst({
      where: { fishSpeciesId: speciesId, imageUrl: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { imageUrl: true },
    });

    const imageUrl = next?.imageUrl ?? null;
    await this.prisma.fishSpecies.update({
      where: { id: speciesId },
      data: { imageUrl },
    });
    await this.prisma.fishEncyclopedia.updateMany({
      where: { fishSpeciesId: speciesId },
      data: { imageUrl },
    });
  }

  private async attachListImages(
    rows: Array<{
      id: number;
      fishSpeciesId: number;
      description: string;
      season: string | null;
      bait: string | null;
      technique: string | null;
      avgLengthCm: number | null;
      minSizeLaw: number | null;
      imageUrl: string | null;
      fishSpecies: {
        nameKo: string;
        nameEn: string | null;
        scientificName: string | null;
        category: string;
        imageUrl: string | null;
      };
    }>,
  ) {
    const items = rows.map((row) => {
      const catalog = getCatalogEntry(row.fishSpeciesId);
      const imageUrl = row.fishSpecies.imageUrl ?? row.imageUrl ?? null;
      return this.toListItem(row, catalog, imageUrl, null);
    });

    return items;
  }

  private toListItem(
    row: {
      fishSpeciesId: number;
      season: string | null;
      bait: string | null;
      technique: string | null;
      minSizeLaw: number | null;
      fishSpecies: { nameKo: string; nameEn: string | null; category: string };
    },
    catalog: ReturnType<typeof getCatalogEntry>,
    imageUrl: string | null,
    imageAttribution: string | null,
  ) {
    const season = row.season ?? catalog?.season ?? null;
    const bait = row.bait ?? catalog?.bait ?? null;
    const technique = row.technique ?? catalog?.technique ?? null;
    const hint = season ?? bait ?? technique;

    return {
      id: row.fishSpeciesId,
      fishSpeciesId: row.fishSpeciesId,
      nameKo: catalog?.nameKo ?? row.fishSpecies.nameKo,
      nameEn: row.fishSpecies.nameEn,
      category: row.fishSpecies.category,
      imageUrl,
      imageAttribution,
      season,
      bait,
      technique,
      minSizeLaw: row.minSizeLaw ?? catalog?.minSizeLaw ?? null,
      hint,
    };
  }

  private buildSummaryLocal(
    nameKo: string,
    description: string | null | undefined,
    category: string,
    catalog?: FishCatalogEntry,
  ): string {
    const fromDescription = this.buildSummaryFromDescription(nameKo, description);
    if (fromDescription && !this.isCodeTaxonomy(fromDescription)) {
      return fromDescription;
    }

    if (catalog) {
      const hints = [catalog.season, catalog.bait, catalog.technique].filter(Boolean);
      if (hints.length) {
        return this.truncate(`${nameKo} — ${hints.join(' · ')}`, 280);
      }
    }

    const label = category === 'freshwater' ? '민물' : '바다';
    return `${nameKo}${this.subjectParticle(nameKo)} ${label}에서 만날 수 있는 어종이에요.`;
  }

  private buildSummaryFromDescription(
    nameKo: string,
    description: string | null | undefined,
  ): string | null {
    if (!description?.trim()) return null;

    const lines = description
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    for (const line of lines) {
      if (/^출처:|^학명:|^분류:/.test(line)) continue;
      if (line.length < 12) continue;
      if (line.startsWith(`${nameKo}(`) || line.startsWith(`${nameKo}（`)) continue;
      return this.truncate(line, 280);
    }

    return null;
  }

  private isCodeTaxonomy(text: string): boolean {
    return /^[A-Z]{2}(\s*>\s*[A-Z]{2})+$/i.test(text.trim());
  }

  private extractHabitatFromDescription(description: string | null | undefined): string | null {
    if (!description) return null;
    const match = description.match(/분포:\s*(.+)/);
    return match?.[1]?.trim().slice(0, 200) ?? null;
  }

  private truncate(text: string, max: number): string {
    if (text.length <= max) return text;
    return `${text.slice(0, max).trim()}…`;
  }

  private subjectParticle(word: string): string {
    if (!word) return '는';
    const code = word.charCodeAt(word.length - 1);
    if (code < 0xac00 || code > 0xd7a3) return '는';
    return (code - 0xac00) % 28 === 0 ? '는' : '은';
  }
}
