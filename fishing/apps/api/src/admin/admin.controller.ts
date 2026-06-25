import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import { ReviewCatchDto } from './dto/review-catch.dto';
import { UpsertAnnouncementDto } from './dto/upsert-announcement.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';

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
}
