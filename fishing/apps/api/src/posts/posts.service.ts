import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isCommunityTagKey, parseTagsInput, type CommunitySort } from './post-tags.util';
import { parsePageLimit } from '../common/pagination.util';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    dto: { title: string; content: string; catchId?: string; imageUrl?: string | null; tags?: string[] },
  ) {
    const tags = this.normalizeTags(dto.tags);
    return this.prisma.post.create({
      data: {
        userId,
        title: dto.title,
        content: dto.content,
        catchId: dto.catchId || null,
        imageUrl: dto.imageUrl || null,
        tags,
      },
      include: {
        user: { select: { id: true, nickname: true, profileImage: true } },
      },
    });
  }

  async findAll(page = 1, limit = 20, sort: CommunitySort = 'latest', tag?: string, q?: string) {
    const paging = parsePageLimit(page, limit, 20, 50);
    const skip = (paging.page - 1) * paging.limit;
    const term = q?.trim();
    const where = {
      deletedAt: null,
      ...(tag && isCommunityTagKey(tag) ? { tags: { has: tag } } : {}),
      ...(term
        ? {
            OR: [
              { title: { contains: term, mode: 'insensitive' as const } },
              { content: { contains: term, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const orderBy =
      sort === 'popular'
        ? [{ comments: { _count: 'desc' as const } }, { viewCount: 'desc' as const }, { createdAt: 'desc' as const }]
        : [{ createdAt: 'desc' as const }];

    const [items, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, profileImage: true } },
          catch: { select: { recordType: true } },
          _count: { select: { comments: true } },
        },
        orderBy,
        skip,
        take: paging.limit,
      }),
      this.prisma.post.count({ where }),
    ]);
    return { items, total, page: paging.page, limit: paging.limit, sort, tag: tag ?? null, q: term ?? null };
  }

  async findById(id: string) {
    const existing = await this.prisma.post.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('게시글을 찾을 수 없습니다.');

    try {
      return await this.prisma.post.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
        include: {
          user: { select: { id: true, nickname: true, profileImage: true } },
          comments: {
            where: { deletedAt: null },
            include: {
              user: { select: { id: true, nickname: true, profileImage: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
          _count: { select: { comments: true } },
        },
      });
    } catch {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }
  }

  async addComment(postId: string, userId: string, content: string) {
    const trimmed = content?.trim() ?? '';
    if (!trimmed) {
      throw new BadRequestException('댓글 내용을 입력해 주세요.');
    }

    const post = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');

    return this.prisma.comment.create({
      data: { postId, userId, content: trimmed },
      include: {
        user: { select: { id: true, nickname: true, profileImage: true } },
      },
    });
  }

  async delete(id: string, userId: string) {
    const post = await this.prisma.post.findFirst({ where: { id, deletedAt: null } });
    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');
    if (post.userId !== userId) throw new ForbiddenException('삭제 권한이 없습니다.');

    return this.prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async update(
    id: string,
    userId: string,
    dto: {
      title: string;
      content: string;
      catchId?: string;
      imageUrl?: string | null;
      tags?: string[];
    },
  ) {
    const post = await this.prisma.post.findUnique({ where: { id, deletedAt: null } });
    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');
    if (post.userId !== userId) throw new ForbiddenException('수정 권한이 없습니다.');

    return this.prisma.post.update({
      where: { id },
      data: {
        title: dto.title.trim(),
        content: dto.content.trim(),
        catchId: dto.catchId === undefined ? post.catchId : dto.catchId || null,
        imageUrl: dto.imageUrl === undefined ? post.imageUrl : dto.imageUrl,
        ...(dto.tags !== undefined ? { tags: this.normalizeTags(dto.tags) } : {}),
      },
      include: {
        user: { select: { id: true, nickname: true, profileImage: true } },
      },
    });
  }

  async findByUser(userId: string, page = 1, limit = 10) {
    const paging = parsePageLimit(page, limit, 10, 50);
    const skip = (paging.page - 1) * paging.limit;
    const [items, total] = await Promise.all([
      this.prisma.post.findMany({
        where: { userId, deletedAt: null },
        include: {
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: paging.limit,
      }),
      this.prisma.post.count({ where: { userId, deletedAt: null } }),
    ]);
    return { items, total, page: paging.page, limit: paging.limit };
  }

  private normalizeTags(tags?: string[]): string[] {
    const normalized = parseTagsInput(tags);
    if (normalized.length > 3) {
      throw new BadRequestException('태그는 최대 3개까지 선택할 수 있습니다.');
    }
    return normalized;
  }
}
