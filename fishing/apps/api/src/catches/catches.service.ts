import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { determineGrade } from '../common/certification/certification-grade.util';
import {
  computeImageHash,
  removeUploadedFile,
  validatePhotoFreshness,
} from '../common/upload/image-integrity.util';



@Injectable()

export class CatchesService {

  constructor(private prisma: PrismaService) {}



  async createCertified(userId: string, file: Express.Multer.File, body: any) {

    if (!file?.path) {
      throw new BadRequestException('사진 파일이 필요합니다.');
    }

    const freshness = await validatePhotoFreshness(file.path);
    if (!freshness.ok) {
      await removeUploadedFile(file.path);
      throw new BadRequestException(freshness.reason);
    }

    const imageHash = await computeImageHash(file.path);
    await this.assertUniqueImageHash(imageHash, file.path);

    const imageUrl = `/uploads/${file.filename}`;



    const catch_ = await this.prisma.catch.create({

      data: {

        userId,

        imageUrl,

        imageHash,

        locationName: body.locationName,

        memo: body.memo,

        recordType: 'certified',

        status: 'pending',

      },

    });



    await this.mockAiProcess(catch_.id);

    const processed = await this.prisma.catch.findUnique({
      where: { id: catch_.id },
      include: { certification: { select: { grade: true, errorMessage: true } } },
    });

    const finalStatus = processed?.status ?? 'pending';
    const message =
      finalStatus === 'approved'
        ? '인증이 완료되었습니다. 랭킹에 반영됩니다.'
        : finalStatus === 'rejected'
          ? processed?.certification?.errorMessage ?? '인증 기준이 충족되지 않아 반려되었습니다.'
          : 'AI 분석 중입니다. 잠시 후 결과를 확인하세요.';

    return {
      catchId: catch_.id,
      status: finalStatus,
      recordType: 'certified',
      grade: processed?.certification?.grade ?? null,
      message,
    };

  }



  async createPersonal(userId: string, file: Express.Multer.File, body: any) {

    if (!file?.path) {
      throw new BadRequestException('사진 파일이 필요합니다.');
    }

    const imageHash = await computeImageHash(file.path);
    await this.assertUniqueImageHash(imageHash, file.path);

    const imageUrl = `/uploads/${file.filename}`;

    const lengthCm = body.lengthCm ? Number(body.lengthCm) : null;

    const fishSpeciesId = body.fishSpeciesId ? Number(body.fishSpeciesId) : null;



    const catch_ = await this.prisma.catch.create({

      data: {

        userId,

        imageUrl,

        imageHash,

        locationName: body.locationName || null,

        memo: body.memo || null,

        recordType: 'personal',

        status: 'approved',

        lengthCm: lengthCm && !Number.isNaN(lengthCm) ? lengthCm : null,

        fishSpeciesId: fishSpeciesId && !Number.isNaN(fishSpeciesId) ? fishSpeciesId : null,

      },

      include: {

        fishSpecies: true,

      },

    });



    return {

      catchId: catch_.id,

      status: 'approved',

      recordType: 'personal',

      message: '자랑 기록이 올라갔습니다. 다른 낚시인의 추천을 받아보세요!',

      catch: catch_,

    };

  }



  private async assertUniqueImageHash(imageHash: string, filePath: string) {
    const existing = await this.prisma.catch.findFirst({
      where: { imageHash, deletedAt: null },
      select: { id: true, userId: true },
    });

    if (existing) {
      await removeUploadedFile(filePath);
      throw new ConflictException(
        '이미 등록된 사진입니다. 동일 사진 재업로드·타인 사진 도용은 허용되지 않습니다.',
      );
    }
  }



  private async mockAiProcess(catchId: string) {
    const mockLength = Math.floor(Math.random() * 30) + 30;
    const mockSpeciesId = Math.floor(Math.random() * 6) + 1;
    const scenario = Math.random();

    const rulerDetected = scenario >= 0.1;
    const speciesConfidence = scenario < 0.25 ? 0.62 : scenario < 0.55 ? 0.78 : 0.92;
    const rules = {
      ruleFlat: scenario >= 0.1,
      ruleVertical: scenario >= 0.1,
      ruleRuler: rulerDetected,
      ruleFullBody: scenario >= 0.35,
    };

    const gradeResult = determineGrade({ rulerDetected, speciesConfidence, rules });

    await this.prisma.catch.update({
      where: { id: catchId },
      data: {
        status: gradeResult.status,
        fishSpeciesId: mockSpeciesId,
        lengthCm: mockLength,
        aiLengthCm: mockLength,
        aiConfidence: speciesConfidence,
        rankScore: gradeResult.rankScoreEligible ? mockLength * 1.0 : null,
      },
    });

    await this.prisma.certification.create({
      data: {
        catchId,
        grade: gradeResult.grade,
        rulerDetected,
        rulerLengthCm: rulerDetected ? mockLength : null,
        speciesDetected: '배스',
        speciesConfidence,
        ...rules,
        processedAt: new Date(),
        errorMessage: gradeResult.status === 'rejected' ? gradeResult.reason : null,
      },
    });
  }



  async findById(id: string) {

    const catch_ = await this.prisma.catch.findUnique({

      where: { id, deletedAt: null },

      include: {

        user: { select: { id: true, nickname: true, profileImage: true } },

        fishSpecies: true,

        certification: true,

      },

    });



    if (!catch_) throw new NotFoundException('기록을 찾을 수 없습니다.');

    return catch_;

  }



  async findStatus(id: string) {

    const catch_ = await this.prisma.catch.findUnique({

      where: { id },

      include: {

        certification: { select: { grade: true } },

        fishSpecies: { select: { nameKo: true } },

      },

    });



    if (!catch_) throw new NotFoundException('기록을 찾을 수 없습니다.');



    return {

      status: catch_.status,

      recordType: catch_.recordType,

      grade: catch_.certification?.grade ?? null,

      lengthCm: catch_.lengthCm,

      fishSpecies: catch_.fishSpecies?.nameKo ?? null,

    };

  }



  async findMyList(userId: string, page = 1, limit = 20, recordType?: string) {

    const skip = (page - 1) * limit;

    const where: any = { userId, deletedAt: null };

    if (recordType === 'certified' || recordType === 'personal') {

      where.recordType = recordType;

    }



    const [items, total] = await Promise.all([

      this.prisma.catch.findMany({

        where,

        include: {

          fishSpecies: true,

          certification: { select: { grade: true } },

        },

        orderBy: { createdAt: 'desc' },

        skip,

        take: limit,

      }),

      this.prisma.catch.count({ where }),

    ]);



    return { items, total, page, limit, recordType: recordType ?? 'all' };
  }

  async updatePersonal(
    userId: string,
    catchId: string,
    body: { memo?: string; locationName?: string; fishSpeciesId?: number },
  ) {
    const catch_ = await this.prisma.catch.findUnique({
      where: { id: catchId, deletedAt: null },
    });

    if (!catch_) throw new NotFoundException('기록을 찾을 수 없습니다.');
    if (catch_.userId !== userId) throw new ForbiddenException('본인 기록만 수정할 수 있습니다.');
    if (catch_.recordType !== 'personal') {
      throw new BadRequestException('자랑 기록만 수정할 수 있습니다.');
    }

    const data: Record<string, unknown> = {};
    if (body.memo !== undefined) data.memo = body.memo.trim() || null;
    if (body.locationName !== undefined) data.locationName = body.locationName.trim() || null;
    if (body.fishSpeciesId !== undefined) data.fishSpeciesId = body.fishSpeciesId;

    return this.prisma.catch.update({
      where: { id: catchId },
      data,
      include: { fishSpecies: true },
    });
  }

  async deletePersonal(userId: string, catchId: string) {
    const catch_ = await this.prisma.catch.findUnique({
      where: { id: catchId, deletedAt: null },
    });

    if (!catch_) throw new NotFoundException('기록을 찾을 수 없습니다.');
    if (catch_.userId !== userId) throw new ForbiddenException('본인 기록만 삭제할 수 있습니다.');
    if (catch_.recordType !== 'personal') {
      throw new BadRequestException('자랑 기록만 삭제할 수 있습니다.');
    }

    return this.prisma.catch.update({
      where: { id: catchId },
      data: { deletedAt: new Date() },
    });
  }

  async addVote(catchId: string, userId: string) {
    const catch_ = await this.prisma.catch.findUnique({
      where: { id: catchId, deletedAt: null },
    });

    if (!catch_) throw new NotFoundException('기록을 찾을 수 없습니다.');
    if (catch_.recordType !== 'personal') {
      throw new BadRequestException('자랑 기록만 추천할 수 있습니다.');
    }
    if (catch_.userId === userId) {
      throw new BadRequestException('본인 기록에는 추천할 수 없습니다.');
    }

    const existing = await this.prisma.catchVote.findUnique({
      where: { catchId_userId: { catchId, userId } },
    });

    if (existing) {
      const voteCount = await this.prisma.catchVote.count({ where: { catchId } });
      return { voted: true, voteCount };
    }

    await this.prisma.catchVote.create({ data: { catchId, userId } });
    const voteCount = await this.prisma.catchVote.count({ where: { catchId } });
    return { voted: true, voteCount };
  }

  async toggleVote(catchId: string, userId: string) {
    const catch_ = await this.prisma.catch.findUnique({
      where: { id: catchId, deletedAt: null },
    });

    if (!catch_) throw new NotFoundException('기록을 찾을 수 없습니다.');
    if (catch_.recordType !== 'personal') {
      throw new BadRequestException('자랑 기록만 추천할 수 있습니다.');
    }
    if (catch_.userId === userId) {
      throw new BadRequestException('본인 기록에는 추천할 수 없습니다.');
    }

    const existing = await this.prisma.catchVote.findUnique({
      where: { catchId_userId: { catchId, userId } },
    });

    if (existing) {
      await this.prisma.catchVote.delete({ where: { id: existing.id } });
      const voteCount = await this.prisma.catchVote.count({ where: { catchId } });
      return { voted: false, voteCount };
    }

    await this.prisma.catchVote.create({ data: { catchId, userId } });
    const voteCount = await this.prisma.catchVote.count({ where: { catchId } });
    return { voted: true, voteCount };
  }

  async getVoteSummary(catchId: string, userId?: string) {
    const [voteCount, myVote] = await Promise.all([
      this.prisma.catchVote.count({ where: { catchId } }),
      userId
        ? this.prisma.catchVote.findUnique({
            where: { catchId_userId: { catchId, userId } },
          })
        : Promise.resolve(null),
    ]);

    return { voteCount, voted: Boolean(myVote) };
  }
}


