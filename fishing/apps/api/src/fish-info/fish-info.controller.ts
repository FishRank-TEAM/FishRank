import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FishInfoService } from './fish-info.service';

@ApiTags('어종 정보 (외부 연동)')
@Controller('fish-info')
export class FishInfoController {
  constructor(private fishInfo: FishInfoService) {}

  @Get('catalog')
  @ApiOperation({ summary: '국내 낚시 어종 전체 카탈로그 (민물·바다·기수)' })
  getCatalog() {
    const data = this.fishInfo.getCatalog();
    return { success: true, data };
  }

  @Get('search')
  @ApiOperation({ summary: 'iNaturalist + 공공데이터포털 통합 검색' })
  @ApiQuery({ name: 'q', required: true })
  async search(@Query('q') q: string) {
    const data = await this.fishInfo.searchExternal(q.trim());
    return { success: true, data };
  }

  @Get('species/:speciesId')
  @ApiOperation({ summary: 'FishRank 어종 ID 기준 통합 정보 조회' })
  async getSpecies(@Param('speciesId') speciesId: string) {
    const data = await this.fishInfo.getEnriched(Number(speciesId));
    return { success: true, data };
  }

  @Post('sync/:speciesId')
  @ApiOperation({ summary: '외부 API → DB 어종 사전 동기화 (단일)' })
  async syncOne(@Param('speciesId') speciesId: string) {
    const data = await this.fishInfo.syncSpecies(Number(speciesId));
    return { success: true, data };
  }

  @Post('sync-all')
  @ApiOperation({ summary: '공공데이터 전체 어류 반영 + 낚시 핵심 37종 상세 동기화' })
  async syncAll() {
    const results = await this.fishInfo.syncAll();
    const ok = results.filter((r) => r.ok).length;
    const stats = await this.fishInfo.getDbStats();
    return { success: true, data: { total: results.length, ok, stats, results } };
  }

  @Post('import-public')
  @ApiOperation({ summary: '해양수산부 공공데이터 어류 전종 DB 반영 (~1,300종)' })
  async importPublic() {
    const data = await this.fishInfo.importPublicFishSpecies();
    return { success: true, data };
  }
}
