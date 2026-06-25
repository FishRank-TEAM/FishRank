import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbacksService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateFeedbackDto) {
    return this.prisma.userFeedback.create({
      data: {
        userId,
        category: dto.category,
        content: dto.content.trim(),
      },
      select: {
        id: true,
        category: true,
        content: true,
        status: true,
        createdAt: true,
      },
    });
  }
}
