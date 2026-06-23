import { Body, Controller, Delete, Get, Param, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { createImageUploadInterceptor, saveUploadedFile } from '../common/upload/upload.config';
import { isEncyclopediaSort, isEncyclopediaTechnique } from './encyclopedia-filter.util';
import { EncyclopediaService } from './encyclopedia.service';
import { CreateEncyclopediaTipDto } from './dto/create-encyclopedia-tip.dto';

@ApiTags('어종 사전')
@Controller('encyclopedia')
export class EncyclopediaController {
  constructor(private encyclopedia: EncyclopediaService) {}

  @Get()
  @ApiOperation({ summary: '어종 사전 목록 (사진·실전 정보)' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'sort', required: false, enum: ['name', 'popular'] })
  @ApiQuery({
    name: 'technique',
    required: false,
    enum: ['all', 'lure', 'float', 'bottom', 'fly', 'ice', 'boat'],
  })
  async getAll(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '48',
    @Query('sort') sort?: string,
    @Query('technique') technique?: string,
  ) {
    const data = await this.encyclopedia.list(
      category,
      search,
      Number(page) || 1,
      Number(limit) || 48,
      isEncyclopediaSort(sort) ? sort : 'name',
      isEncyclopediaTechnique(technique) ? technique : 'all',
    );
    return { success: true, data };
  }

  @Get('stats')
  @ApiOperation({ summary: '어종 사전 통계' })
  async getStats() {
    const data = await this.encyclopedia.getStats();
    return { success: true, data };
  }

  @Get(':speciesId/detail')
  @ApiOperation({ summary: '어종 상세 (실전 정보·기사·기여)' })
  async getDetail(@Param('speciesId') speciesId: string) {
    const data = await this.encyclopedia.getDetail(Number(speciesId));
    return { success: true, data };
  }

  @Get(':speciesId/edit-logs')
  @ApiOperation({ summary: '어종 정보 수정 기록' })
  async getEditLogs(@Param('speciesId') speciesId: string) {
    const data = await this.encyclopedia.getEditLogs(Number(speciesId));
    return { success: true, data };
  }

  @Get(':speciesId/tips')
  @ApiOperation({ summary: '정보 기여 목록' })
  async getTips(@Param('speciesId') speciesId: string) {
    const data = await this.encyclopedia.getTips(Number(speciesId));
    return { success: true, data };
  }

  @Post(':speciesId/tips')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '어종 정보 수정 (사진·텍스트, 수정 로그 기록)' })
  @UseInterceptors(createImageUploadInterceptor('image', 'encyclopedia'))
  async createTip(
    @Param('speciesId') speciesId: string,
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateEncyclopediaTipDto,
  ) {
    const data = await this.encyclopedia.createTip(
      Number(speciesId),
      user.id,
      dto,
      saveUploadedFile(file),
    );
    return { success: true, data };
  }

  @Delete(':speciesId/tips/:tipId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '정보 기여 삭제 (본인만)' })
  async deleteTip(
    @Param('speciesId') speciesId: string,
    @Param('tipId') tipId: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.encyclopedia.deleteTip(Number(speciesId), tipId, user.id);
    return { success: true };
  }

  @Get(':speciesId/news')
  @ApiOperation({ summary: '관련 뉴스 기사' })
  async getNews(@Param('speciesId') speciesId: string) {
    const data = await this.encyclopedia.getNews(Number(speciesId));
    return { success: true, data };
  }

  @Get(':speciesId')
  @ApiOperation({ summary: '어종 기본 정보 (레거시)' })
  async getOne(@Param('speciesId') speciesId: string) {
    const data = await this.encyclopedia.getDetail(Number(speciesId));
    return { success: true, data };
  }
}
