import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  getRegionDisplayName,
  RegionLevel,
  resolveCatchRegionKey,
} from '../common/constants/korean-regions';

type RankingEntry = {
  rank: number;
  user: { id: string; nickname: string; profileImage: string | null };
  catch: {
    id: string;
    imageUrl: string;
    locationName: string | null;
    createdAt: Date;
    memo?: string | null;
  };
  fishSpecies: { id: number; nameKo: string; rarityWeight: unknown } | null;
  lengthCm: unknown;
  rankScore: unknown;
  voteCount?: number;
  grade: string | null;
  recordType: 'certified' | 'personal';
  verified: boolean;
};

export type RankingType = 'official' | 'unofficial';

export type RankingHighlight = RankingEntry & {
  previousRank: number | null;
  rankGain: number;
  highlightReason: string | null;
};

type CatchWithRelations = {
  userId?: string;
  user: { id: string; nickname: string; profileImage: string | null; activityRegion?: string | null };
  id: string;
  imageUrl: string;
  locationName: string | null;
  createdAt: Date;
  memo?: string | null;
  recordType: string;
  fishSpecies: { id: number; nameKo: string; rarityWeight: unknown } | null;
  lengthCm: unknown;
  rankScore: unknown;
  certification: { grade: string } | null;
  _count?: { votes: number };
};

type OvertakeCatch = {
  id: string;
  userId: string;
  rankScore: unknown;
  createdAt: Date;
  lengthCm: unknown;
  user: { id: string; nickname: string; profileImage: string | null };
  fishSpecies: { id: number; nameKo: string } | null;
  certification: { grade: string } | null;
};

@Injectable()
export class RankingsService {
  constructor(private prisma: PrismaService) {}

  private buildBaseWhere(
    speciesId?: number,
    weekly = false,
    rankingType: RankingType = 'official',
  ) {
    const where: Record<string, unknown> =
      rankingType === 'unofficial'
        ? {
            status: 'approved',
            recordType: 'personal',
            deletedAt: null,
          }
        : {
            status: 'approved',
            recordType: 'certified',
            deletedAt: null,
            rankScore: { not: null },
          };

    if (speciesId) {
      where.fishSpeciesId = speciesId;
    }

    if (weekly) {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      where.createdAt = { gte: weekAgo };
    }

    return where;
  }

  private catchInclude(rankingType: RankingType) {
    return {
      user: { select: { id: true, nickname: true, profileImage: true } },
      fishSpecies: true,
      certification: { select: { grade: true } },
      ...(rankingType === 'unofficial'
        ? { _count: { select: { votes: true } } }
        : {}),
    };
  }

  private mapCatchToRanking(
    c: CatchWithRelations,
    rank: number,
    rankingType: RankingType,
  ): RankingEntry {
    const voteCount = c._count?.votes ?? 0;
    const score =
      rankingType === 'official' ? Number(c.rankScore) : voteCount;

    return {
      rank,
      user: {
        id: c.user.id,
        nickname: c.user.nickname,
        profileImage: c.user.profileImage,
      },
      catch: {
        id: c.id,
        imageUrl: c.imageUrl,
        locationName: c.locationName,
        createdAt: c.createdAt,
        ...(rankingType === 'unofficial' ? { memo: c.memo ?? null } : {}),
      },
      fishSpecies: c.fishSpecies,
      lengthCm: c.lengthCm,
      rankScore: score,
      voteCount: rankingType === 'unofficial' ? voteCount : undefined,
      grade: rankingType === 'official' ? c.certification?.grade ?? null : null,
      recordType: c.recordType as 'certified' | 'personal',
      verified: rankingType === 'official',
    };
  }

  private sortRankings(list: CatchWithRelations[]): CatchWithRelations[] {
    return [...list].sort((a, b) => {
      const diff = Number(b.rankScore) - Number(a.rankScore);
      if (diff !== 0) return diff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  private sortUnofficialByVotes(list: CatchWithRelations[]): CatchWithRelations[] {
    return [...list].sort((a, b) => {
      const diff = (b._count?.votes ?? 0) - (a._count?.votes ?? 0);
      if (diff !== 0) return diff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  private rankUnofficialCatches(catches: CatchWithRelations[], limit: number): RankingEntry[] {
    return this.sortUnofficialByVotes(catches)
      .slice(0, limit)
      .map((c, index) => this.mapCatchToRanking(c, index + 1, 'unofficial'));
  }

  private async fetchRankedCatches(
    speciesId: number | undefined,
    weekly: boolean,
    rankingType: RankingType,
    limit: number,
  ) {
    const catches = await this.prisma.catch.findMany({
      where: this.buildBaseWhere(speciesId, weekly, rankingType),
      include: this.catchInclude(rankingType),
      ...(rankingType === 'official'
        ? { orderBy: { rankScore: 'desc' }, take: limit }
        : {}),
    });

    if (rankingType === 'official') {
      return catches.map((c, index) => this.mapCatchToRanking(c, index + 1, rankingType));
    }

    return this.rankUnofficialCatches(catches, limit);
  }

  private toHighlight(
    entry: RankingEntry,
    previousRank: number | null,
    rankGain: number,
    highlightReason: string | null,
  ): RankingHighlight {
    return { ...entry, previousRank, rankGain, highlightReason };
  }

  private async getVoteCountsBefore(catchIds: string[], before: Date): Promise<Map<string, number>> {
    if (!catchIds.length) return new Map();
    const rows = await this.prisma.catchVote.groupBy({
      by: ['catchId'],
      where: { catchId: { in: catchIds }, createdAt: { lt: before } },
      _count: { _all: true },
    });
    return new Map(rows.map((r) => [r.catchId, r._count._all]));
  }

  private sortUnofficialByVoteMap(
    list: CatchWithRelations[],
    voteMap: Map<string, number>,
  ): CatchWithRelations[] {
    return [...list].sort((a, b) => {
      const diff = (voteMap.get(b.id) ?? 0) - (voteMap.get(a.id) ?? 0);
      if (diff !== 0) return diff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  private pickBiggestRankGain(
    topCurrent: CatchWithRelations[],
    beforeSorted: CatchWithRelations[],
    rankingType: RankingType,
    minGain = 2,
  ): RankingHighlight | null {
    let best: {
      catch: CatchWithRelations;
      currentRank: number;
      previousRank: number;
      rankGain: number;
    } | null = null;

    for (let i = 0; i < topCurrent.length; i++) {
      const c = topCurrent[i];
      const currentRank = i + 1;
      const prevIndex = beforeSorted.findIndex((x) => x.id === c.id);
      const previousRank = prevIndex >= 0 ? prevIndex + 1 : beforeSorted.length + 1;
      const rankGain = previousRank - currentRank;
      if (rankGain < minGain) continue;

      if (
        !best ||
        rankGain > best.rankGain ||
        (rankGain === best.rankGain && currentRank < best.currentRank)
      ) {
        best = { catch: c, currentRank, previousRank, rankGain };
      }
    }

    if (!best) return null;

    return this.toHighlight(
      this.mapCatchToRanking(best.catch, best.currentRank, rankingType),
      best.previousRank,
      best.rankGain,
      `${best.previousRank}위 → ${best.currentRank}위`,
    );
  }

  async getTodayHighlight(
    speciesId?: number,
    periodType: 'weekly' | 'alltime' = 'weekly',
    rankingType: RankingType = 'official',
    topPool = 20,
  ): Promise<RankingHighlight | null> {
    const weekly = periodType === 'weekly';
    const rankings = await this.fetchRankedCatches(speciesId, weekly, rankingType, topPool);
    if (!rankings.length) return null;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    if (rankingType === 'unofficial') {
      const allCatches = (await this.prisma.catch.findMany({
        where: this.buildBaseWhere(speciesId, weekly, 'unofficial'),
        include: this.catchInclude('unofficial'),
      })) as CatchWithRelations[];

      const catchIds = allCatches.map((c) => c.id);
      const votesBefore = await this.getVoteCountsBefore(catchIds, startOfToday);
      const currentVoteMap = new Map<string, number>(
        allCatches.map((c) => [c.id, c._count?.votes ?? 0]),
      );
      const currentSorted = this.sortUnofficialByVoteMap(allCatches, currentVoteMap);
      const beforeSorted = this.sortUnofficialByVoteMap(
        allCatches.filter((c) => c.createdAt < startOfToday),
        votesBefore,
      );

      const highlight = this.pickBiggestRankGain(
        currentSorted.slice(0, topPool),
        beforeSorted,
        'unofficial',
      );
      return highlight ?? this.toHighlight(rankings[0], null, 0, null);
    }

    const allCatches = (await this.prisma.catch.findMany({
      where: this.buildBaseWhere(speciesId, weekly, 'official'),
      include: this.catchInclude('official'),
    })) as CatchWithRelations[];

    const beforeToday = allCatches.filter((c) => c.createdAt < startOfToday);
    const currentSorted = this.sortRankings(allCatches);
    const beforeSorted = this.sortRankings(beforeToday);

    const highlight = this.pickBiggestRankGain(
      currentSorted.slice(0, topPool),
      beforeSorted,
      'official',
    );

    if (highlight) return highlight;

    const first = currentSorted[0];
    if (!first) return null;
    return this.toHighlight(this.mapCatchToRanking(first, 1, 'official'), null, 0, null);
  }

  async getBragFeed(
    speciesId?: number,
    periodType: 'weekly' | 'alltime' = 'weekly',
    excludeUserId?: string,
    limit = 50,
  ) {
    const weekly = periodType === 'weekly';
    const where: Record<string, unknown> = this.buildBaseWhere(speciesId, weekly, 'unofficial');
    if (excludeUserId) {
      where.userId = { not: excludeUserId };
    }

    const catches = await this.prisma.catch.findMany({
      where,
      include: this.catchInclude('unofficial'),
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return catches.map((c) => this.mapCatchToRanking(c, 0, 'unofficial'));
  }

  async getTopRankings(speciesId?: number, limit = 10, rankingType: RankingType = 'official') {
    return this.fetchRankedCatches(speciesId, false, rankingType, limit);
  }

  async getWeeklyRankings(speciesId?: number, limit = 10, rankingType: RankingType = 'official') {
    return this.fetchRankedCatches(speciesId, true, rankingType, limit);
  }

  async getRegionalKings(
    level: RegionLevel,
    periodType: 'weekly' | 'alltime' = 'weekly',
    speciesId?: number,
    rankingType: RankingType = 'official',
  ) {
    const catches = (await this.prisma.catch.findMany({
      where: this.buildBaseWhere(speciesId, periodType === 'weekly', rankingType),
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            profileImage: true,
            activityRegion: true,
          },
        },
        fishSpecies: true,
        certification: { select: { grade: true } },
        ...(rankingType === 'unofficial'
          ? { _count: { select: { votes: true } } }
          : {}),
      },
    })) as CatchWithRelations[];

    const ranked =
      rankingType === 'official'
        ? this.sortRankings(catches)
        : this.sortUnofficialByVotes(catches);

    const kings = new Map<string, RankingEntry>();
    const counts = new Map<string, number>();

    for (const c of ranked) {
      const regionKey = resolveCatchRegionKey(
        c.user.activityRegion,
        c.locationName,
        level,
      );
      if (!regionKey) continue;

      counts.set(regionKey, (counts.get(regionKey) ?? 0) + 1);
      if (!kings.has(regionKey)) {
        kings.set(regionKey, this.mapCatchToRanking(c, 1, rankingType));
      }
    }

    return Array.from(kings.entries())
      .map(([regionKey, king]) => ({
        regionKey,
        regionName: getRegionDisplayName(regionKey, level),
        recordCount: counts.get(regionKey) ?? 0,
        king,
      }))
      .sort((a, b) => a.regionName.localeCompare(b.regionName, 'ko'));
  }

  async getRegionalRankings(
    regionKey: string,
    level: RegionLevel,
    periodType: 'weekly' | 'alltime' = 'weekly',
    speciesId?: number,
    limit = 20,
    rankingType: RankingType = 'official',
  ) {
    const catches = (await this.prisma.catch.findMany({
      where: this.buildBaseWhere(speciesId, periodType === 'weekly', rankingType),
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            profileImage: true,
            activityRegion: true,
          },
        },
        fishSpecies: true,
        certification: { select: { grade: true } },
        ...(rankingType === 'unofficial'
          ? { _count: { select: { votes: true } } }
          : {}),
      },
    })) as CatchWithRelations[];

    const filtered = catches.filter((c) =>
      resolveCatchRegionKey(c.user.activityRegion, c.locationName, level) === regionKey,
    );

    const ranked =
      rankingType === 'official'
        ? this.sortRankings(filtered)
        : this.sortUnofficialByVotes(filtered);

    return {
      regionKey,
      regionName: getRegionDisplayName(regionKey, level),
      rankings: ranked.slice(0, limit).map((c, index) =>
        this.mapCatchToRanking(c, index + 1, rankingType),
      ),
    };
  }

  private sortOvertakePool(list: OvertakeCatch[]): OvertakeCatch[] {
    return [...list].sort((a, b) => {
      const diff = Number(b.rankScore) - Number(a.rankScore);
      if (diff !== 0) return diff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  async getTopOvertakes(
    periodType: 'weekly' | 'alltime' = 'weekly',
    speciesId?: number,
    topN = 10,
    limit = 8,
    rankingType: RankingType = 'official',
  ) {
    if (rankingType === 'unofficial') {
      return [];
    }

    const weekly = periodType === 'weekly';
    const allCatches = (await this.prisma.catch.findMany({
      where: this.buildBaseWhere(speciesId, weekly),
      include: {
        user: { select: { id: true, nickname: true, profileImage: true } },
        fishSpecies: { select: { id: true, nameKo: true } },
        certification: { select: { grade: true } },
      },
    })) as OvertakeCatch[];

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);

    const recent = allCatches
      .filter((c) => c.createdAt >= cutoff)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    type OvertakeEvent = {
      overtaker: { id: string; nickname: string; profileImage: string | null };
      overtaken: { id: string; nickname: string; profileImage: string | null };
      newRank: number;
      overtakenPreviousRank: number;
      fishSpecies: { id: number; nameKo: string } | null;
      lengthCm: unknown;
      grade: string | null;
      occurredAt: Date;
    };

    const events: OvertakeEvent[] = [];
    const seenCatchIds = new Set<string>();

    for (const c of recent) {
      if (seenCatchIds.has(c.id)) continue;

      const beforePool = allCatches.filter((x) => x.createdAt < c.createdAt);
      const afterPool = allCatches.filter((x) => x.createdAt <= c.createdAt);

      const beforeTop = this.sortOvertakePool(beforePool).slice(0, topN);
      const afterTop = this.sortOvertakePool(afterPool).slice(0, topN);

      const newRank = afterTop.findIndex((x) => x.id === c.id) + 1;
      if (newRank <= 0 || newRank > topN) continue;

      const displaced = beforeTop[newRank - 1];
      if (!displaced || displaced.id === c.id) continue;
      if (displaced.userId === c.userId) continue;
      if (Number(c.rankScore) <= Number(displaced.rankScore)) continue;

      const displacedAfterRank = afterTop.findIndex((x) => x.id === displaced.id);
      if (displacedAfterRank !== -1 && displacedAfterRank + 1 <= newRank) continue;

      seenCatchIds.add(c.id);
      events.push({
        overtaker: {
          id: c.user.id,
          nickname: c.user.nickname,
          profileImage: c.user.profileImage,
        },
        overtaken: {
          id: displaced.user.id,
          nickname: displaced.user.nickname,
          profileImage: displaced.user.profileImage,
        },
        newRank,
        overtakenPreviousRank: newRank,
        fishSpecies: c.fishSpecies,
        lengthCm: c.lengthCm,
        grade: c.certification?.grade ?? null,
        occurredAt: c.createdAt,
      });

      if (events.length >= limit) break;
    }

    return events;
  }
}
