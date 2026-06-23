import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { RankingsService } from './rankings.service';
@ApiTags('랭킹')
@Controller('rankings')
export class RankingsController {
  constructor(private rankingsService: RankingsService) {}

  private parseRankingType(value?: string): 'official' | 'unofficial' {
    return value === 'unofficial' ? 'unofficial' : 'official';
  }

  @Get('regional')
  @ApiOperation({ summary: '지역별 낚시왕 목록 (지도용)' })
  @ApiQuery({ name: 'periodType', required: false, enum: ['weekly', 'alltime'] })
  @ApiQuery({ name: 'level', required: false, enum: ['sido', 'sig'] })
  @ApiQuery({ name: 'speciesId', required: false, type: Number })
  @ApiQuery({ name: 'rankingType', required: false, enum: ['official', 'unofficial'] })
  async getRegionalKings(
    @Query('periodType') periodType: string = 'weekly',
    @Query('level') level: string = 'sido',
    @Query('speciesId') speciesId?: string,
    @Query('rankingType') rankingType?: string,
  ) {
    const sid = speciesId ? Number(speciesId) : undefined;
    const regionLevel = level === 'sig' ? 'sig' : 'sido';
    const period = periodType === 'alltime' ? 'alltime' : 'weekly';
    const type = this.parseRankingType(rankingType);

    const regions = await this.rankingsService.getRegionalKings(
      regionLevel,
      period,
      sid,
      type,
    );

    return {
      success: true,
      data: { periodType: period, level: regionLevel, rankingType: type, regions },
    };
  }

  @Get('regional/detail')
  @ApiOperation({ summary: '선택 지역 랭킹 상세' })
  @ApiQuery({ name: 'regionKey', required: true, type: String })
  @ApiQuery({ name: 'periodType', required: false, enum: ['weekly', 'alltime'] })
  @ApiQuery({ name: 'level', required: false, enum: ['sido', 'sig'] })
  @ApiQuery({ name: 'speciesId', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'rankingType', required: false, enum: ['official', 'unofficial'] })
  async getRegionalDetail(
    @Query('regionKey') regionKey: string,
    @Query('periodType') periodType: string = 'weekly',
    @Query('level') level: string = 'sido',
    @Query('speciesId') speciesId?: string,
    @Query('limit') limit = 20,
    @Query('rankingType') rankingType?: string,
  ) {
    const sid = speciesId ? Number(speciesId) : undefined;
    const regionLevel = level === 'sig' ? 'sig' : 'sido';
    const period = periodType === 'alltime' ? 'alltime' : 'weekly';
    const type = this.parseRankingType(rankingType);

    const data = await this.rankingsService.getRegionalRankings(
      regionKey,
      regionLevel,
      period,
      sid,
      Number(limit),
      type,
    );

    return { success: true, data: { ...data, rankingType: type } };
  }

  @Get('overtakes')
  @ApiOperation({ summary: '상위권 추월 피드' })
  @ApiQuery({ name: 'periodType', required: false, enum: ['weekly', 'alltime'] })
  @ApiQuery({ name: 'speciesId', required: false, type: Number })
  @ApiQuery({ name: 'topN', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getOvertakes(
    @Query('periodType') periodType: string = 'weekly',
    @Query('speciesId') speciesId?: string,
    @Query('topN') topN = 10,
    @Query('limit') limit = 8,
  ) {
    const sid = speciesId ? Number(speciesId) : undefined;
    const period = periodType === 'alltime' ? 'alltime' : 'weekly';

    const overtakes = await this.rankingsService.getTopOvertakes(
      period,
      sid,
      Number(topN),
      Number(limit),
    );

    return { success: true, data: { periodType: period, topN: Number(topN), overtakes } };
  }

  @Get('brag-feed')
  @ApiOperation({ summary: '자랑 랭킹 — 새 글 평가용 피드' })
  @ApiQuery({ name: 'periodType', required: false, enum: ['weekly', 'alltime'] })
  @ApiQuery({ name: 'speciesId', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getBragFeed(
    @Query('periodType') periodType: string = 'weekly',
    @Query('speciesId') speciesId?: string,
    @Query('limit') limit = 50,
  ) {
    const sid = speciesId ? Number(speciesId) : undefined;
    const period = periodType === 'alltime' ? 'alltime' : 'weekly';
    const feed = await this.rankingsService.getBragFeed(
      sid,
      period,
      undefined,
      Number(limit) || 50,
    );
    return { success: true, data: { periodType: period, feed } };
  }

  @Get()
  @ApiOperation({ summary: '랭킹 목록 조회' })
  @ApiQuery({ name: 'periodType', required: false, enum: ['weekly', 'alltime'] })
  @ApiQuery({ name: 'speciesId', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'rankingType', required: false, enum: ['official', 'unofficial'] })
  async getRankings(
    @Query('periodType') periodType: string = 'weekly',
    @Query('speciesId') speciesId?: string,
    @Query('limit') limit = 10,
    @Query('rankingType') rankingType?: string,
  ) {
    const sid = speciesId ? Number(speciesId) : undefined;
    const lim = Number(limit);
    const type = this.parseRankingType(rankingType);

    const rankings =
      periodType === 'alltime'
        ? await this.rankingsService.getTopRankings(sid, lim, type)
        : await this.rankingsService.getWeeklyRankings(sid, lim, type);

    const period = periodType === 'alltime' ? 'alltime' : 'weekly';
    const highlight =
      type === 'official'
        ? await this.rankingsService.getTodayHighlight(sid, period, type, Math.min(lim, 20))
        : null;

    return {
      success: true,
      data: {
        periodType,
        rankingType: type,
        rankings,
        highlight,
      },
    };
  }
}
