import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { ReviewCatchDto } from './dto/review-catch.dto';
import type { UpsertAnnouncementDto } from './dto/upsert-announcement.dto';
import type { UpdateFeedbackDto } from './dto/update-feedback.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import type { UpdateCatchRankingDto } from './dto/update-catch-ranking.dto';
import type { UpdateSpeciesDto } from './dto/update-species.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const [
      pendingCatches,
      flaggedReports,
      openFeedbacks,
      totalCatches,
      totalPosts,
      activeTournaments,
      publishedAnnouncements,
      totalUsers,
    ] = await Promise.all([
      this.prisma.catch.count({ where: { deletedAt: null, status: 'pending', recordType: 'certified' } }),
      this.countFlaggedReports(3),
      this.prisma.userFeedback.count({ where: { status: 'open' } }),
      this.prisma.catch.count({ where: { deletedAt: null } }),
      this.prisma.post.count({ where: { deletedAt: null } }),
      this.prisma.tournament.count({ where: { status: { in: ['upcoming', 'active'] } } }),
      this.prisma.announcement.count({ where: { isPublished: true } }),
      this.prisma.user.count({ where: { deletedAt: null } }),
    ]);

    const recentPending = await this.prisma.catch.findMany({
      where: { deletedAt: null, status: 'pending', recordType: 'certified' },
      include: {
        user: { select: { nickname: true } },
        fishSpecies: { select: { nameKo: true } },
        certification: { select: { grade: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const recentFlagged = await this.listFlaggedReports(3, 5);

    const recentPosts = await this.prisma.post.findMany({
      where: { deletedAt: null },
      include: { user: { select: { nickname: true } }, _count: { select: { comments: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const recentFeedbacks = await this.prisma.userFeedback.findMany({
      where: { status: 'open' },
      include: { user: { select: { nickname: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return {
      pendingCatches,
      flaggedReports,
      openFeedbacks,
      totalCatches,
      totalPosts,
      activeTournaments,
      publishedAnnouncements,
      totalUsers,
      recentPending,
      recentFlagged,
      recentPosts,
      recentFeedbacks,
      generatedAt: now.toISOString(),
    };
  }

  async countFlaggedReports(minCount = 3) {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM (
        SELECT target_type, target_id
        FROM content_reports
        WHERE status = 'open'
        GROUP BY target_type, target_id
        HAVING COUNT(*) >= ${minCount}
      ) flagged
    `;
    return Number(rows[0]?.count ?? 0);
  }

  async listFlaggedReports(minCount = 3, limit = 50) {
    const rows = await this.prisma.$queryRaw<
      Array<{ target_type: string; target_id: string; report_count: number }>
    >`
      SELECT target_type, target_id, COUNT(*)::int AS report_count
      FROM content_reports
      WHERE status = 'open'
      GROUP BY target_type, target_id
      HAVING COUNT(*) >= ${minCount}
      ORDER BY report_count DESC
      LIMIT ${limit}
    `;

    const items = await Promise.all(
      rows.map(async (row) => {
        const reports = await this.prisma.contentReport.findMany({
          where: {
            targetType: row.target_type,
            targetId: row.target_id,
            status: 'open',
          },
          include: { reporter: { select: { nickname: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        });

        let target: Record<string, unknown> | null = null;
        if (row.target_type === 'catch') {
          const catch_ = await this.prisma.catch.findUnique({
            where: { id: row.target_id, deletedAt: null },
            include: {
              user: { select: { id: true, nickname: true, profileImage: true } },
              fishSpecies: { select: { nameKo: true } },
              certification: { select: { grade: true } },
            },
          });
          target = catch_;
        } else if (row.target_type === 'post') {
          const post = await this.prisma.post.findUnique({
            where: { id: row.target_id, deletedAt: null },
            include: { user: { select: { id: true, nickname: true } } },
          });
          target = post;
        }

        return {
          targetType: row.target_type,
          targetId: row.target_id,
          reportCount: row.report_count,
          reports,
          target,
        };
      }),
    );

    return items.filter((item) => item.target);
  }

  async resolveFlaggedReport(
    targetType: 'catch' | 'post',
    targetId: string,
    action: 'dismiss' | 'delete',
  ) {
    if (action === 'delete') {
      if (targetType === 'catch') {
        const catch_ = await this.prisma.catch.findUnique({ where: { id: targetId, deletedAt: null } });
        if (!catch_) throw new NotFoundException('기록을 찾을 수 없습니다.');
        await this.prisma.catch.update({
          where: { id: targetId },
          data: { deletedAt: new Date() },
        });
      } else {
        const post = await this.prisma.post.findUnique({ where: { id: targetId, deletedAt: null } });
        if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');
        await this.prisma.post.update({
          where: { id: targetId },
          data: { deletedAt: new Date() },
        });
      }
      await this.prisma.contentReport.updateMany({
        where: { targetType, targetId, status: 'open' },
        data: { status: 'resolved' },
      });
      return { action, targetType, targetId };
    }

    await this.prisma.contentReport.updateMany({
      where: { targetType, targetId, status: 'open' },
      data: { status: 'dismissed' },
    });
    return { action, targetType, targetId };
  }

  async listCatches(status?: string, page = 1, limit = 20) {
    const take = Math.min(50, Math.max(1, limit));
    const skip = (Math.max(1, page) - 1) * take;
    const where: Record<string, unknown> = { deletedAt: null, recordType: 'certified' };
    if (status && status !== 'all') where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.catch.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, profileImage: true } },
          fishSpecies: { select: { nameKo: true } },
          certification: true,
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.catch.count({ where }),
    ]);

    return { items, total, page: Math.max(1, page), limit: take, totalPages: Math.max(1, Math.ceil(total / take)) };
  }

  async reviewCatch(catchId: string, dto: ReviewCatchDto) {
    const catch_ = await this.prisma.catch.findUnique({
      where: { id: catchId, deletedAt: null },
      include: { certification: true },
    });
    if (!catch_) throw new NotFoundException('기록을 찾을 수 없습니다.');

    await this.prisma.catch.update({
      where: { id: catchId },
      data: {
        status: dto.status,
        ...(dto.status === 'approved' && catch_.lengthCm
          ? { rankScore: Number(catch_.lengthCm) * 1.0 }
          : {}),
      },
    });

    if (catch_.certification) {
      await this.prisma.certification.update({
        where: { catchId },
        data: {
          errorMessage: dto.status === 'rejected' ? (dto.note?.trim() || '관리자 검수 반려') : null,
          processedAt: new Date(),
        },
      });
    }

    return this.prisma.catch.findUnique({
      where: { id: catchId },
      include: {
        user: { select: { nickname: true } },
        fishSpecies: { select: { nameKo: true } },
        certification: true,
      },
    });
  }

  async listPosts(page = 1, limit = 20) {
    const take = Math.min(50, Math.max(1, limit));
    const skip = (Math.max(1, page) - 1) * take;

    const [items, total] = await Promise.all([
      this.prisma.post.findMany({
        where: { deletedAt: null },
        include: {
          user: { select: { id: true, nickname: true } },
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.post.count({ where: { deletedAt: null } }),
    ]);

    return { items, total, page: Math.max(1, page), limit: take, totalPages: Math.max(1, Math.ceil(total / take)) };
  }

  async deletePost(postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');

    await this.prisma.post.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }

  async listAnnouncements() {
    return this.prisma.announcement.findMany({
      include: { author: { select: { nickname: true } } },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAnnouncement(userId: string, dto: UpsertAnnouncementDto) {
    return this.prisma.announcement.create({
      data: {
        type: dto.type,
        title: dto.title.trim(),
        content: dto.content.trim(),
        linkUrl: dto.linkUrl?.trim() || null,
        isPinned: dto.isPinned ?? false,
        isPublished: dto.isPublished ?? true,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        createdBy: userId,
      },
      include: { author: { select: { nickname: true } } },
    });
  }

  async updateAnnouncement(id: string, dto: UpsertAnnouncementDto) {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('공지를 찾을 수 없습니다.');

    return this.prisma.announcement.update({
      where: { id },
      data: {
        type: dto.type,
        title: dto.title.trim(),
        content: dto.content.trim(),
        linkUrl: dto.linkUrl?.trim() || null,
        isPinned: dto.isPinned ?? false,
        isPublished: dto.isPublished ?? true,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      },
      include: { author: { select: { nickname: true } } },
    });
  }

  async deleteAnnouncement(id: string) {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('공지를 찾을 수 없습니다.');
    await this.prisma.announcement.delete({ where: { id } });
    return { deleted: true };
  }

  async getPublicAnnouncements(limit = 10) {
    const now = new Date();
    return this.prisma.announcement.findMany({
      where: {
        isPublished: true,
        OR: [
          { startsAt: null, endsAt: null },
          { startsAt: { lte: now }, endsAt: null },
          { startsAt: null, endsAt: { gte: now } },
          { startsAt: { lte: now }, endsAt: { gte: now } },
        ],
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        linkUrl: true,
        isPinned: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
      },
    });
  }

  async listFeedbacks(status?: string, page = 1, limit = 20) {
    const where = status && status !== 'all' ? { status } : {};
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.userFeedback.findMany({
        where,
        include: { user: { select: { id: true, nickname: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.userFeedback.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateFeedback(id: string, dto: UpdateFeedbackDto) {
    const existing = await this.prisma.userFeedback.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('피드백을 찾을 수 없습니다.');

    return this.prisma.userFeedback.update({
      where: { id },
      data: {
        status: dto.status,
        adminNote: dto.adminNote?.trim() || null,
      },
      include: { user: { select: { id: true, nickname: true } } },
    });
  }

  async listUsers(search?: string, role?: string, accountStatus = 'active', page = 1, limit = 20) {
    const take = Math.min(50, Math.max(1, limit));
    const skip = (Math.max(1, page) - 1) * take;
    const where: Record<string, unknown> = {};

    if (accountStatus === 'suspended') {
      where.deletedAt = { not: null };
    } else if (accountStatus === 'all') {
      // no deletedAt filter
    } else {
      where.deletedAt = null;
    }

    if (role && role !== 'all') where.role = role;

    const q = search?.trim();
    if (q) {
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { nickname: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          nickname: true,
          role: true,
          provider: true,
          profileImage: true,
          fishingCategory: true,
          activityRegion: true,
          createdAt: true,
          deletedAt: true,
          _count: {
            select: {
              catches: true,
              posts: true,
              comments: true,
              userFeedbacks: true,
              contentReports: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      total,
      page: Math.max(1, page),
      limit: take,
      totalPages: Math.max(1, Math.ceil(total / take)),
    };
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        role: true,
        provider: true,
        providerId: true,
        profileImage: true,
        bio: true,
        activityRegion: true,
        fishingCategory: true,
        featuredCatchIds: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        _count: {
          select: {
            catches: true,
            posts: true,
            comments: true,
            userFeedbacks: true,
            contentReports: true,
            catchVotes: true,
            tournamentEntries: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const [recentCatches, recentPosts, recentFeedbacks] = await Promise.all([
      this.prisma.catch.findMany({
        where: { userId, deletedAt: null },
        include: {
          fishSpecies: { select: { nameKo: true } },
          certification: { select: { grade: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.prisma.post.findMany({
        where: { userId, deletedAt: null },
        select: { id: true, title: true, viewCount: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.userFeedback.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return { user, recentCatches, recentPosts, recentFeedbacks };
  }

  async updateUser(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    if (dto.role === 'user' && user.role === 'admin') {
      const adminCount = await this.prisma.user.count({
        where: { role: 'admin', deletedAt: null, id: { not: userId } },
      });
      if (adminCount < 1) {
        throw new BadRequestException('마지막 관리자 계정의 권한은 해제할 수 없습니다.');
      }
    }

    const data: Record<string, unknown> = {};
    if (dto.role) data.role = dto.role;
    if (dto.accountStatus === 'suspended') data.deletedAt = new Date();
    if (dto.accountStatus === 'active') data.deletedAt = null;

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        nickname: true,
        role: true,
        deletedAt: true,
      },
    });
  }

  async listAdminRankings(
    periodType = 'alltime',
    rankingType: 'official' | 'unofficial' = 'official',
    speciesId?: number,
    page = 1,
    limit = 30,
  ) {
    const take = Math.min(50, Math.max(1, limit));
    const skip = (Math.max(1, page) - 1) * take;
    const weekly = periodType === 'weekly';

    const where: Record<string, unknown> =
      rankingType === 'unofficial'
        ? { status: 'approved', recordType: 'personal', deletedAt: null }
        : { status: 'approved', recordType: 'certified', deletedAt: null };

    if (speciesId) where.fishSpeciesId = speciesId;
    if (weekly) {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      where.createdAt = { gte: weekAgo };
    }

    const include = {
      user: { select: { id: true, nickname: true, email: true, profileImage: true } },
      fishSpecies: { select: { id: true, nameKo: true, rarityWeight: true } },
      certification: { select: { grade: true } },
      _count: { select: { votes: true } },
    };

    const total = await this.prisma.catch.count({ where });
    let items;

    if (rankingType === 'official') {
      items = await this.prisma.catch.findMany({
        where,
        include,
        orderBy: { rankScore: 'desc' },
        skip,
        take,
      });
    } else {
      const pool = await this.prisma.catch.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        take: Math.min(1000, total),
      });
      items = pool
        .sort((a, b) => b._count.votes - a._count.votes)
        .slice(skip, skip + take);
    }

    return {
      items: items.map((c, index) => ({
        ...c,
        displayRank: skip + index + 1,
        effectiveScore:
          rankingType === 'official' ? Number(c.rankScore ?? 0) : c._count.votes,
      })),
      total,
      page: Math.max(1, page),
      limit: take,
      totalPages: Math.max(1, Math.ceil(total / take)),
      periodType,
      rankingType,
    };
  }

  async updateCatchRanking(catchId: string, dto: UpdateCatchRankingDto) {
    const catch_ = await this.prisma.catch.findUnique({
      where: { id: catchId, deletedAt: null },
      include: { certification: true },
    });
    if (!catch_) throw new NotFoundException('기록을 찾을 수 없습니다.');

    const data: Record<string, unknown> = {};
    if (dto.rankScore !== undefined) data.rankScore = dto.rankScore;
    if (dto.lengthCm !== undefined) data.lengthCm = dto.lengthCm;
    if (dto.status) data.status = dto.status;
    if (dto.excludeFromRanking) data.rankScore = null;

    if (dto.status === 'approved' && dto.rankScore === undefined && !dto.excludeFromRanking) {
      const length = dto.lengthCm ?? catch_.lengthCm;
      if (length) data.rankScore = Number(length);
    }

    return this.prisma.catch.update({
      where: { id: catchId },
      data,
      include: {
        user: { select: { id: true, nickname: true, email: true } },
        fishSpecies: { select: { id: true, nameKo: true } },
        certification: { select: { grade: true } },
        _count: { select: { votes: true } },
      },
    });
  }

  async deleteCatch(catchId: string) {
    const catch_ = await this.prisma.catch.findUnique({ where: { id: catchId, deletedAt: null } });
    if (!catch_) throw new NotFoundException('기록을 찾을 수 없습니다.');
    await this.prisma.catch.update({
      where: { id: catchId },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }

  async listComments(page = 1, limit = 30, search?: string) {
    const take = Math.min(50, Math.max(1, limit));
    const skip = (Math.max(1, page) - 1) * take;
    const where: Record<string, unknown> = { deletedAt: null };

    const q = search?.trim();
    if (q) {
      where.OR = [
        { content: { contains: q, mode: 'insensitive' } },
        { user: { nickname: { contains: q, mode: 'insensitive' } } },
        { post: { title: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, email: true } },
          post: { select: { id: true, title: true, deletedAt: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.comment.count({ where }),
    ]);

    return {
      items,
      total,
      page: Math.max(1, page),
      limit: take,
      totalPages: Math.max(1, Math.ceil(total / take)),
    };
  }

  async deleteComment(commentId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId, deletedAt: null } });
    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다.');
    await this.prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }

  async listSpecies(search?: string, page = 1, limit = 30) {
    const take = Math.min(100, Math.max(1, limit));
    const skip = (Math.max(1, page) - 1) * take;
    const where: Record<string, unknown> = {};
    const q = search?.trim();
    if (q) {
      where.OR = [
        { nameKo: { contains: q, mode: 'insensitive' } },
        { nameEn: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.fishSpecies.findMany({
        where,
        include: {
          _count: { select: { catches: true } },
        },
        orderBy: { nameKo: 'asc' },
        skip,
        take,
      }),
      this.prisma.fishSpecies.count({ where }),
    ]);

    return {
      items,
      total,
      page: Math.max(1, page),
      limit: take,
      totalPages: Math.max(1, Math.ceil(total / take)),
    };
  }

  async updateSpecies(speciesId: number, dto: UpdateSpeciesDto) {
    const species = await this.prisma.fishSpecies.findUnique({ where: { id: speciesId } });
    if (!species) throw new NotFoundException('어종을 찾을 수 없습니다.');

    return this.prisma.fishSpecies.update({
      where: { id: speciesId },
      data: {
        ...(dto.rarityWeight !== undefined ? { rarityWeight: dto.rarityWeight } : {}),
        ...(dto.minLengthCm !== undefined ? { minLengthCm: dto.minLengthCm } : {}),
      },
      include: { _count: { select: { catches: true } } },
    });
  }

  async listTournamentEntries(tournamentId?: string, page = 1, limit = 30) {
    const take = Math.min(50, Math.max(1, limit));
    const skip = (Math.max(1, page) - 1) * take;
    const where: Record<string, unknown> = {};
    if (tournamentId) where.tournamentId = tournamentId;

    const [items, total] = await Promise.all([
      this.prisma.tournamentEntry.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, email: true } },
          tournament: { select: { id: true, title: true, status: true } },
        },
        orderBy: { joinedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.tournamentEntry.count({ where }),
    ]);

    return {
      items,
      total,
      page: Math.max(1, page),
      limit: take,
      totalPages: Math.max(1, Math.ceil(total / take)),
    };
  }
}
