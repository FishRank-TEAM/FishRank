import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id, deletedAt: null },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByNickname(nickname: string) {
    return this.prisma.user.findUnique({ where: { nickname } });
  }

  async create(data: { email: string; nickname: string; passwordHash: string }) {
    return this.prisma.user.create({ data });
  }

  async getFeaturedCatches(userId: string, featuredCatchIds: string[]) {
    if (!featuredCatchIds.length) return [];

    const catches = await this.prisma.catch.findMany({
      where: {
        id: { in: featuredCatchIds },
        userId,
        deletedAt: null,
        status: 'approved',
        recordType: 'certified',
      },
      include: {
        fishSpecies: true,
        certification: { select: { grade: true } },
      },
    });

    return featuredCatchIds
      .map((id) => catches.find((c) => c.id === id))
      .filter((c): c is NonNullable<typeof c> => !!c);
  }

  async getPublicProfile(nickname: string) {
    const user = await this.prisma.user.findUnique({
      where: { nickname, deletedAt: null },
      select: {
        id: true,
        nickname: true,
        profileImage: true,
        bio: true,
        activityRegion: true,
        fishingCategory: true,
        featuredCatchIds: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('존재하지 않는 사용자입니다.');

    const [stats, featuredCatches, catches, personalCatches, posts, gears] = await Promise.all([
      this.getMyStats(user.id),
      this.getFeaturedCatches(user.id, user.featuredCatchIds),
      this.prisma.catch.findMany({
        where: { userId: user.id, deletedAt: null, status: 'approved', recordType: 'certified' },
        include: {
          fishSpecies: true,
          certification: { select: { grade: true } },
        },
        orderBy: { rankScore: 'desc' },
        take: 6,
      }),
      this.prisma.catch.findMany({
        where: { userId: user.id, deletedAt: null, recordType: 'personal' },
        include: { fishSpecies: true },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      this.prisma.post.findMany({
        where: { userId: user.id, deletedAt: null },
        include: { _count: { select: { comments: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.getUserGears(user.id),
    ]);

    return { user, stats, featuredCatches, catches, personalCatches, posts, gears };
  }

  async getMyStats(userId: string) {
    const [fishCount, personalCount, totalPosts] = await Promise.all([
      this.prisma.catch.count({
        where: { userId, deletedAt: null, status: 'approved', recordType: 'certified' },
      }),
      this.prisma.catch.count({
        where: { userId, deletedAt: null, recordType: 'personal' },
      }),
      this.prisma.post.count({
        where: { userId, deletedAt: null },
      }),
    ]);

    return { fishCount, personalCount, totalPosts };
  }

  async updateProfile(
    userId: string,
    data: { bio?: string | null; activityRegion?: string; fishingCategory?: string },
  ) {
    const updateData: Record<string, unknown> = {};
    if (data.bio !== undefined) {
      const trimmed = data.bio?.trim() ?? '';
      updateData.bio = trimmed.length > 0 ? trimmed : null;
    }
    if (data.activityRegion !== undefined) {
      updateData.activityRegion = data.activityRegion || null;
    }
    if (data.fishingCategory !== undefined) {
      updateData.fishingCategory = data.fishingCategory || null;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        nickname: true,
        profileImage: true,
        bio: true,
        activityRegion: true,
        fishingCategory: true,
        featuredCatchIds: true,
      },
    });
  }

  private readonly MAX_GEARS = 6;

  async getUserGears(userId: string) {
    return this.prisma.userGear.findMany({
      where: { userId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        sortOrder: true,
        createdAt: true,
      },
    });
  }

  async createUserGear(
    userId: string,
    dto: { title: string; description?: string },
    imageUrl?: string | null,
  ) {
    const count = await this.prisma.userGear.count({ where: { userId } });
    if (count >= this.MAX_GEARS) {
      throw new BadRequestException(`장비는 최대 ${this.MAX_GEARS}개까지 등록할 수 있습니다.`);
    }

    return this.prisma.userGear.create({
      data: {
        userId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        imageUrl: imageUrl ?? null,
        sortOrder: count,
      },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        sortOrder: true,
        createdAt: true,
      },
    });
  }

  async updateUserGear(
    userId: string,
    gearId: string,
    dto: { title?: string; description?: string },
    imageUrl?: string | null,
  ) {
    const gear = await this.prisma.userGear.findFirst({
      where: { id: gearId, userId },
    });
    if (!gear) throw new NotFoundException('장비를 찾을 수 없습니다.');

    const updateData: Record<string, unknown> = {};
    if (dto.title !== undefined) updateData.title = dto.title.trim();
    if (dto.description !== undefined) {
      updateData.description = dto.description?.trim() || null;
    }
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

    return this.prisma.userGear.update({
      where: { id: gearId },
      data: updateData,
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        sortOrder: true,
        createdAt: true,
      },
    });
  }

  async deleteUserGear(userId: string, gearId: string) {
    const gear = await this.prisma.userGear.findFirst({
      where: { id: gearId, userId },
    });
    if (!gear) throw new NotFoundException('장비를 찾을 수 없습니다.');

    await this.prisma.userGear.delete({ where: { id: gearId } });
    return { deleted: true };
  }

  async updateFeaturedCatches(userId: string, catchIds: string[]) {
    const uniqueIds = [...new Set(catchIds)];
    if (uniqueIds.length > 3) {
      throw new BadRequestException('대표 기록은 최대 3개까지 설정할 수 있습니다.');
    }

    if (uniqueIds.length > 0) {
      const validCount = await this.prisma.catch.count({
        where: {
          id: { in: uniqueIds },
          userId,
          deletedAt: null,
          status: 'approved',
          recordType: 'certified',
        },
      });
      if (validCount !== uniqueIds.length) {
        throw new BadRequestException('본인의 인증 완료 기록만 대표로 설정할 수 있습니다.');
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { featuredCatchIds: uniqueIds },
    });

    return this.getFeaturedCatches(userId, uniqueIds);
  }

  async getMyPosts(userId: string) {
    return this.prisma.post.findMany({
      where: { userId, deletedAt: null },
      include: { _count: { select: { comments: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
