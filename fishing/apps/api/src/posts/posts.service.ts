import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isCommunityTagKey, parseTagsInput, type CommunitySort } from './post-tags.util';

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
    const skip = (page - 1) * limit;
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
        take: limit,
      }),
      this.prisma.post.count({ where }),
    ]);
    return { items, total, page, limit, sort, tag: tag ?? null, q: term ?? null };
  }

  async findById(id: string) {
    const post = await this.prisma.post.update({
      where: { id, deletedAt: null },
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
    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');
    return post;
  }

  async addComment(postId: string, userId: string, content: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');

    return this.prisma.comment.create({
      data: { postId, userId, content },
      include: {
        user: { select: { id: true, nickname: true, profileImage: true } },
      },
    });
  }

  async delete(id: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });
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
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.post.findMany({
        where: { userId, deletedAt: null },
        include: {
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.post.count({ where: { userId, deletedAt: null } }),
    ]);
    return { items, total, page, limit };
  }

  private normalizeTags(tags?: string[]): string[] {
    const normalized = parseTagsInput(tags);
    if (normalized.length > 3) {
      throw new BadRequestException('태그는 최대 3개까지 선택할 수 있습니다.');
    }
    return normalized;
  }
}
