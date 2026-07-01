import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import { ReviewCatchDto } from './dto/review-catch.dto';
import { UpsertAnnouncementDto } from './dto/upsert-announcement.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateCatchRankingDto } from './dto/update-catch-ranking.dto';
import { UpdateSpeciesDto } from './dto/update-species.dto';

@ApiTags('관리자')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private admin: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: '관리자 대시보드 통계' })
  async getStats() {
    const data = await this.admin.getStats();
    return { success: true, data };
  }

  @Get('catches')
  @ApiOperation({ summary: '인증 기록 검수 목록' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listCatches(
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const data = await this.admin.listCatches(status, Number(page) || 1, Number(limit) || 20);
    return { success: true, data };
  }

  @Patch('catches/:id/review')
  @ApiOperation({ summary: '인증 기록 승인/반려' })
  async reviewCatch(@Param('id') id: string, @Body() dto: ReviewCatchDto) {
    const data = await this.admin.reviewCatch(id, dto);
    return { success: true, data };
  }

  @Get('posts')
  @ApiOperation({ summary: '게시글 관리 목록' })
  async listPosts(@Query('page') page = '1', @Query('limit') limit = '20') {
    const data = await this.admin.listPosts(Number(page) || 1, Number(limit) || 20);
    return { success: true, data };
  }

  @Delete('posts/:id')
  @ApiOperation({ summary: '게시글 삭제 (관리자)' })
  async deletePost(@Param('id') id: string) {
    const data = await this.admin.deletePost(id);
    return { success: true, data };
  }

  @Get('announcements')
  @ApiOperation({ summary: '공지·이벤트 목록 (관리자)' })
  async listAnnouncements() {
    const data = await this.admin.listAnnouncements();
    return { success: true, data };
  }

  @Post('announcements')
  @ApiOperation({ summary: '공지·이벤트 등록' })
  async createAnnouncement(@CurrentUser() user: { id: string }, @Body() dto: UpsertAnnouncementDto) {
    const data = await this.admin.createAnnouncement(user.id, dto);
    return { success: true, data };
  }

  @Patch('announcements/:id')
  @ApiOperation({ summary: '공지·이벤트 수정' })
  async updateAnnouncement(@Param('id') id: string, @Body() dto: UpsertAnnouncementDto) {
    const data = await this.admin.updateAnnouncement(id, dto);
    return { success: true, data };
  }

  @Delete('announcements/:id')
  @ApiOperation({ summary: '공지·이벤트 삭제' })
  async deleteAnnouncement(@Param('id') id: string) {
    const data = await this.admin.deleteAnnouncement(id);
    return { success: true, data };
  }

  @Get('reports/flagged')
  @ApiOperation({ summary: '신고 3건 이상 콘텐츠 (신고 수 내림차순)' })
  @ApiQuery({ name: 'minCount', required: false })
  async listFlaggedReports(@Query('minCount') minCount = '3') {
    const data = await this.admin.listFlaggedReports(Number(minCount) || 3);
    return { success: true, data };
  }

  @Patch('reports/:targetType/:targetId')
  @ApiOperation({ summary: '신고 처리 — 무시(dismiss) 또는 콘텐츠 삭제(delete)' })
  async resolveFlaggedReport(
    @Param('targetType') targetType: 'catch' | 'post',
    @Param('targetId') targetId: string,
    @Body() body: { action: 'dismiss' | 'delete' },
  ) {
    const data = await this.admin.resolveFlaggedReport(targetType, targetId, body.action);
    return { success: true, data };
  }

  @Get('feedbacks')
  @ApiOperation({ summary: '사용자 피드백 목록' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listFeedbacks(
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const data = await this.admin.listFeedbacks(status, Number(page) || 1, Number(limit) || 20);
    return { success: true, data };
  }

  @Patch('feedbacks/:id')
  @ApiOperation({ summary: '피드백 상태 변경' })
  async updateFeedback(@Param('id') id: string, @Body() dto: UpdateFeedbackDto) {
    const data = await this.admin.updateFeedback(id, dto);
    return { success: true, data };
  }

  @Get('users')
  @ApiOperation({ summary: '회원 목록' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'accountStatus', required: false, enum: ['active', 'suspended', 'all'] })
  async listUsers(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('accountStatus') accountStatus = 'active',
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const data = await this.admin.listUsers(search, role, accountStatus, Number(page) || 1, Number(limit) || 20);
    return { success: true, data };
  }

  @Get('users/:id')
  @ApiOperation({ summary: '회원 상세' })
  async getUser(@Param('id') id: string) {
    const data = await this.admin.getUserDetail(id);
    return { success: true, data };
  }

  @Patch('users/:id')
  @ApiOperation({ summary: '회원 역할·계정 상태 변경' })
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const data = await this.admin.updateUser(id, dto);
    return { success: true, data };
  }

  @Get('rankings')
  @ApiOperation({ summary: '랭킹 운영 목록' })
  @ApiQuery({ name: 'periodType', required: false, enum: ['weekly', 'alltime'] })
  @ApiQuery({ name: 'rankingType', required: false, enum: ['official', 'unofficial'] })
  @ApiQuery({ name: 'speciesId', required: false })
  async listRankings(
    @Query('periodType') periodType = 'alltime',
    @Query('rankingType') rankingType: 'official' | 'unofficial' = 'official',
    @Query('speciesId') speciesId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '30',
  ) {
    const sid = speciesId ? Number(speciesId) : undefined;
    const data = await this.admin.listAdminRankings(
      periodType,
      rankingType,
      sid,
      Number(page) || 1,
      Number(limit) || 30,
    );
    return { success: true, data };
  }

  @Patch('catches/:id/ranking')
  @ApiOperation({ summary: '랭킹 점수·상태 수동 조정' })
  async updateCatchRanking(@Param('id') id: string, @Body() dto: UpdateCatchRankingDto) {
    const data = await this.admin.updateCatchRanking(id, dto);
    return { success: true, data };
  }

  @Delete('catches/:id')
  @ApiOperation({ summary: '기록 삭제 (soft delete)' })
  async deleteCatch(@Param('id') id: string) {
    const data = await this.admin.deleteCatch(id);
    return { success: true, data };
  }

  @Get('comments')
  @ApiOperation({ summary: '댓글 목록' })
  async listComments(
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '30',
  ) {
    const data = await this.admin.listComments(Number(page) || 1, Number(limit) || 30, search);
    return { success: true, data };
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: '댓글 삭제' })
  async deleteComment(@Param('id') id: string) {
    const data = await this.admin.deleteComment(id);
    return { success: true, data };
  }

  @Get('species')
  @ApiOperation({ summary: '어종 마스터 목록' })
  async listSpecies(
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '30',
  ) {
    const data = await this.admin.listSpecies(search, Number(page) || 1, Number(limit) || 30);
    return { success: true, data };
  }

  @Patch('species/:id')
  @ApiOperation({ summary: '어종 파라미터 수정 (희귀도·법정치)' })
  async updateSpecies(@Param('id') id: string, @Body() dto: UpdateSpeciesDto) {
    const data = await this.admin.updateSpecies(Number(id), dto);
    return { success: true, data };
  }

  @Get('tournament-entries')
  @ApiOperation({ summary: '대회 참가 목록' })
  @ApiQuery({ name: 'tournamentId', required: false })
  async listTournamentEntries(
    @Query('tournamentId') tournamentId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '30',
  ) {
    const data = await this.admin.listTournamentEntries(tournamentId, Number(page) || 1, Number(limit) || 30);
    return { success: true, data };
  }
}
