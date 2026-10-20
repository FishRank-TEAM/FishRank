import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { resolveSpeciesId } from '../ai/species-slug.util';
import { determineGrade } from '../common/certification/certification-grade.util';
import { computeRankScore } from '../common/certification/rank-score.util';
import {
  computeImageHash,
  removeUploadedFile,
  validatePhotoFreshness,
} from '../common/upload/image-integrity.util';
import { isUniqueConstraintError, softDeleteCatchData } from '../common/upload/catch-retention.util';
import { computePerceptualHash, isNearDuplicate } from '../common/upload/image-phash.util';
import { parsePageLimit } from '../common/pagination.util';
import { TournamentsService } from '../tournaments/tournaments.service';

function claimedLocation(body: { locationLat?: unknown; locationLng?: unknown }) {
  const lat = Number(body.locationLat);
  const lng = Number(body.locationLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  return { lat, lng };
}



@Injectable()

export class CatchesService {

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private tournaments: TournamentsService,
  ) {}



  async createCertified(userId: string, file: Express.Multer.File, body: any) {

    if (!file?.path) {
      throw new BadRequestException('사진 파일이 필요합니다.');
    }

    const freshness = await validatePhotoFreshness(file.path, undefined, claimedLocation(body));
    if (!freshness.ok) {
      await removeUploadedFile(file.path);
      throw new BadRequestException(freshness.reason);
    }

    const imageHash = await computeImageHash(file.path);
    await this.assertUniqueImageHash(imageHash, file.path);
    const perceptualHash = await computePerceptualHash(file.path);
    await this.assertUniquePerceptualHash(perceptualHash, file.path);

    let claim;
    try {
      claim = await this.tournaments.resolveDayCodeClaim(userId, body);
    } catch (error) {
      await removeUploadedFile(file.path);
      throw error;
    }

    const imageUrl = `/uploads/${file.filename}`;

    const catch_ = await this.createCertifiedRow(
      userId,
      file.path,
      imageUrl,
      imageHash,
      perceptualHash,
      body,
      freshness,
      claim,
    );

    try {
      await this.runAiProcess(catch_.id, imageUrl);
    } catch (error) {
      await this.discardFailedCertifiedCatch(catch_.id, file.path);
      throw error;
    }

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
    const perceptualHash = await computePerceptualHash(file.path);
    await this.assertUniquePerceptualHash(perceptualHash, file.path);

    const imageUrl = `/uploads/${file.filename}`;

    const lengthCm = body.lengthCm ? Number(body.lengthCm) : null;

    const fishSpeciesId = body.fishSpeciesId ? Number(body.fishSpeciesId) : null;



    const catch_ = await this.createPersonalRow(
      userId,
      file.path,
      imageUrl,
      imageHash,
      perceptualHash,
      body,
      lengthCm,
      fishSpeciesId,
    );



    return {

      catchId: catch_.id,

      status: 'approved',

      recordType: 'personal',

      message: '자랑 기록이 올라갔습니다. 다른 낚시인의 추천을 받아보세요!',

      catch: catch_,

    };

  }



  private async createCertifiedRow(
    userId: string,
    filePath: string,
    imageUrl: string,
    imageHash: string,
    perceptualHash: string | null,
    body: { locationName?: string; memo?: string },
    freshness: { takenAt?: Date; exifLat?: number; exifLng?: number; integrityNote?: string },
    claim: { claimedTournamentId: string | null; claimedDayCode: string | null; dayCodeStatus: string | null },
  ) {
    try {
      return await this.prisma.catch.create({
        data: {
          userId,
          imageUrl,
          imageHash,
          perceptualHash,
          claimedTournamentId: claim.claimedTournamentId,
          claimedDayCode: claim.claimedDayCode,
          dayCodeStatus: claim.dayCodeStatus,
          locationName: body.locationName,
          memo: body.memo,
          photoTakenAt: freshness.takenAt,
          exifLat: freshness.exifLat,
          exifLng: freshness.exifLng,
          integrityNote: freshness.integrityNote,
          recordType: 'certified',
          status: 'pending',
        },
      });
    } catch (error) {
      return this.rethrowDuplicateImage(error, filePath);
    }
  }

  private async createPersonalRow(
    userId: string,
    filePath: string,
    imageUrl: string,
    imageHash: string,
    perceptualHash: string | null,
    body: { locationName?: string; memo?: string },
    lengthCm: number | null,
    fishSpeciesId: number | null,
  ) {
    try {
      return await this.prisma.catch.create({
        data: {
          userId,
          imageUrl,
          imageHash,
          perceptualHash,
          locationName: body.locationName || null,
          memo: body.memo || null,
          recordType: 'personal',
          status: 'approved',
          lengthCm: lengthCm && !Number.isNaN(lengthCm) ? lengthCm : null,
          fishSpeciesId: fishSpeciesId && !Number.isNaN(fishSpeciesId) ? fishSpeciesId : null,
        },
        include: { fishSpecies: true },
      });
    } catch (error) {
      return this.rethrowDuplicateImage(error, filePath);
    }
  }

  private async assertUniqueImageHash(imageHash: string, filePath: string) {
    const existing = await this.prisma.catch.findFirst({
      where: { imageHash },
      select: { id: true, deletedAt: true },
    });

    if (!existing) return;

    if (!existing.deletedAt) {
      await removeUploadedFile(filePath);
      throw new ConflictException(
        '이미 등록된 사진입니다. 동일 사진 재업로드·타인 사진 도용은 허용되지 않습니다.',
      );
    }

    await this.prisma.catch.update({
      where: { id: existing.id },
      data: { imageHash: null, perceptualHash: null },
    });
  }

  private async assertUniquePerceptualHash(perceptualHash: string | null, filePath: string) {
    if (!perceptualHash) return;

    const rows = await this.prisma.catch.findMany({
      where: { deletedAt: null, perceptualHash: { not: null } },
      select: { perceptualHash: true },
    });

    const duplicate = rows.some(
      (row) => row.perceptualHash && isNearDuplicate(perceptualHash, row.perceptualHash),
    );
    if (!duplicate) return;

    await removeUploadedFile(filePath);
    throw new ConflictException(
      '이미 등록된 사진과 매우 비슷한 사진입니다. 같은 사진을 조금 바꾼 재업로드는 허용되지 않습니다.',
    );
  }

  private async rethrowDuplicateImage(error: unknown, filePath: string): Promise<never> {
    if (isUniqueConstraintError(error)) {
      await removeUploadedFile(filePath);
      throw new ConflictException(
        '이미 등록된 사진입니다. 동일 사진 재업로드·타인 사진 도용은 허용되지 않습니다.',
      );
    }
    throw error;
  }

  private async discardFailedCertifiedCatch(catchId: string, filePath: string) {
    await this.prisma.certification.deleteMany({ where: { catchId } });
    await this.prisma.catch.delete({ where: { id: catchId } });
    await removeUploadedFile(filePath);
  }



  private async runAiProcess(catchId: string, imageUrl: string) {
    const analysis = await this.aiService.analyze(catchId, imageUrl);

    const rules = {
      ruleFlat: analysis.ruleFlat,
      ruleVertical: analysis.ruleVertical,
      ruleRuler: analysis.ruleRuler,
      ruleFullBody: analysis.ruleFullBody,
    };

    const gradeResult = determineGrade({
      rulerDetected: analysis.rulerDetected,
      speciesConfidence: analysis.speciesConfidence,
      rules,
    });

    const fishSpeciesId = resolveSpeciesId(analysis.speciesDetected);
    const species = fishSpeciesId
      ? await this.prisma.fishSpecies.findUnique({ where: { id: fishSpeciesId } })
      : null;

    const lengthCm = analysis.rulerLengthCm;
    const rankScore = computeRankScore(
      lengthCm,
      species?.rarityWeight ?? 1,
      gradeResult.rankScoreEligible,
    );

    await this.prisma.catch.update({
      where: { id: catchId },
      data: {
        status: gradeResult.status,
        fishSpeciesId: species?.id ?? null,
        lengthCm,
        aiLengthCm: lengthCm,
        aiConfidence: analysis.speciesConfidence,
        rankScore,
      },
    });

    await this.prisma.certification.create({
      data: {
        catchId,
        grade: gradeResult.grade,
        rulerDetected: analysis.rulerDetected,
        rulerStartPx: analysis.rulerStartPx,
        rulerEndPx: analysis.rulerEndPx,
        rulerLengthCm: analysis.rulerLengthCm,
        speciesDetected: species?.nameKo ?? analysis.speciesDetected,
        speciesConfidence: analysis.speciesConfidence,
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

    const paging = parsePageLimit(page, limit, 20, 50);
    const skip = (paging.page - 1) * paging.limit;

    const where: any = { userId, deletedAt: null };

    if (recordType === 'certified' || recordType === 'personal') {

      where.recordType = recordType;

    }



    const [items, total] = await Promise.all([

      this.prisma.catch.findMany({

        where,

        include: {

          fishSpecies: true,

          certification: { select: { grade: true, errorMessage: true } },

        },

        orderBy: { createdAt: 'desc' },

        skip,

        take: paging.limit,

      }),

      this.prisma.catch.count({ where }),

    ]);



    return { items, total, page: paging.page, limit: paging.limit, recordType: recordType ?? 'all' };
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
      data: softDeleteCatchData(),
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


