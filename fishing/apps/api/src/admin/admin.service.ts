import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { ReviewCatchDto } from './dto/review-catch.dto';
import type { UpsertAnnouncementDto } from './dto/upsert-announcement.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const [
      pendingCatches,
      flaggedReports,
      totalCatches,
      totalPosts,
      activeTournaments,
      publishedAnnouncements,
      totalUsers,
    ] = await Promise.all([
      this.prisma.catch.count({ where: { deletedAt: null, status: 'pending', recordType: 'certified' } }),
      this.countFlaggedReports(3),
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

    return {
      pendingCatches,
      flaggedReports,
      totalCatches,
      totalPosts,
      activeTournaments,
      publishedAnnouncements,
      totalUsers,
      recentPending,
      recentFlagged,
      recentPosts,
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
}
