import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async create(reporterId: string, dto: CreateReportDto) {
    await this.assertReportableTarget(dto.targetType, dto.targetId, reporterId);

    const existing = await this.prisma.contentReport.findUnique({
      where: {
        targetType_targetId_reporterId: {
          targetType: dto.targetType,
          targetId: dto.targetId,
          reporterId,
        },
      },
    });
    if (existing) {
      throw new ConflictException('이미 신고한 콘텐츠입니다.');
    }

    const report = await this.prisma.contentReport.create({
      data: {
        targetType: dto.targetType,
        targetId: dto.targetId,
        reporterId,
        reason: dto.reason.trim(),
        detail: dto.detail?.trim() || null,
      },
    });

    const count = await this.prisma.contentReport.count({
      where: {
        targetType: dto.targetType,
        targetId: dto.targetId,
        status: 'open',
      },
    });

    return { report, openReportCount: count };
  }

  private async assertReportableTarget(
    targetType: 'catch' | 'post',
    targetId: string,
    reporterId: string,
  ) {
    if (targetType === 'catch') {
      const catch_ = await this.prisma.catch.findUnique({
        where: { id: targetId, deletedAt: null },
        select: { userId: true },
      });
      if (!catch_) throw new NotFoundException('기록을 찾을 수 없습니다.');
      if (catch_.userId === reporterId) {
        throw new BadRequestException('본인 기록은 신고할 수 없습니다.');
      }
      return;
    }

    const post = await this.prisma.post.findUnique({
      where: { id: targetId, deletedAt: null },
      select: { userId: true },
    });
    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');
    if (post.userId === reporterId) {
      throw new BadRequestException('본인 게시글은 신고할 수 없습니다.');
    }
  }
}
