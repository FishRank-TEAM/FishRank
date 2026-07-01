import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { PrismaService } from '../prisma/prisma.service';
import { determineGrade } from '../common/certification/certification-grade.util';
import { createImageUploadInterceptor } from '../common/upload/upload.config';
import { AiService } from './ai.service';
import { DevOnlyGuard } from './dev-only.guard';
import { TestByUrlDto } from './dto/test-by-url.dto';
import { resolveSpeciesId, resolveSpeciesNameKo } from './species-slug.util';

@ApiTags('AI 테스터 (개발용)')
@Controller('ai')
@UseGuards(DevOnlyGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'AI 서버 상태 확인' })
  async health() {
    const aiHealth = await this.aiService.getServerHealth();
    return {
      success: true,
      data: {
        apiOnline: true,
        aiServerOnline: aiHealth?.status === 'ok',
        aiServerUrl: process.env.AI_SERVER_URL ?? 'http://localhost:8000',
        model: aiHealth?.model ?? null,
        speciesClassifier: aiHealth?.speciesClassifier ?? null,
        yoloReady: aiHealth?.yoloReady ?? false,
        yoloModelPath: aiHealth?.yoloModelPath ?? null,
        yoloClassCount: aiHealth?.yoloClassCount ?? null,
        inferenceVersion: aiHealth?.inferenceVersion ?? null,
      },
    };
  }

  @Post('test')
  @ApiOperation({ summary: '이미지 업로드 후 AI 분석 (DB 저장 없음)' })
  @UseInterceptors(createImageUploadInterceptor('image', 'ai-test'))
  async testUpload(@UploadedFile() file: Express.Multer.File) {
    if (!file?.path) {
      throw new BadRequestException('이미지 파일이 필요합니다.');
    }

    return this.runTestAnalysis(`/uploads/${file.filename}`);
  }

  @Post('test-by-url')
  @ApiOperation({ summary: '기존 uploads 경로 이미지로 AI 분석' })
  async testByUrl(@Body() body: TestByUrlDto) {
    return this.runTestAnalysis(body.imageUrl);
  }

  private async runTestAnalysis(imageUrl: string) {
    const started = Date.now();
    const catchId = `test-${Date.now()}`;

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
      ? await this.prisma.fishSpecies.findUnique({
          where: { id: fishSpeciesId },
          select: { id: true, nameKo: true, nameEn: true, rarityWeight: true },
        })
      : null;

    const candidateSlugs = (analysis.speciesTopCandidates ?? []).map((item) => item.slug);
    const candidateIds = candidateSlugs
      .map((slug) => resolveSpeciesId(slug))
      .filter((id): id is number => id != null);
    const candidateSpecies =
      candidateIds.length > 0
        ? await this.prisma.fishSpecies.findMany({
            where: { id: { in: candidateIds } },
            select: { id: true, nameKo: true },
          })
        : [];
    const nameKoById = new Map(candidateSpecies.map((item) => [item.id, item.nameKo]));
    const speciesTopCandidates = (analysis.speciesTopCandidates ?? []).map((item) => {
      const id = resolveSpeciesId(item.slug);
      return {
        ...item,
        nameKo:
          id != null ? nameKoById.get(id) ?? resolveSpeciesNameKo(item.slug) : resolveSpeciesNameKo(item.slug),
      };
    });
    const speciesDisplayName =
      species?.nameKo ?? resolveSpeciesNameKo(analysis.speciesDetected);
    const analysisWithCandidates = {
      ...analysis,
      speciesTopCandidates,
      speciesDisplayName,
    };

    const lengthCm = analysis.rulerLengthCm;
    const rarityWeight = species ? Number(species.rarityWeight) : 1.0;
    const rankScorePreview =
      gradeResult.rankScoreEligible && lengthCm != null
        ? Math.round(lengthCm * rarityWeight * 100) / 100
        : null;

    return {
      success: true,
      data: {
        catchId,
        imageUrl,
        processingMs: Date.now() - started,
        analysis: analysisWithCandidates,
        grade: gradeResult.grade,
        status: gradeResult.status,
        gradeReason: gradeResult.reason,
        rankScorePreview,
        species: species
          ? { ...species, nameKo: speciesDisplayName }
          : fishSpeciesId
            ? {
                id: fishSpeciesId,
                nameKo: speciesDisplayName,
                nameEn: analysis.speciesDetected,
                rarityWeight: 1,
              }
            : null,
        rules,
      },
    };
  }
}
