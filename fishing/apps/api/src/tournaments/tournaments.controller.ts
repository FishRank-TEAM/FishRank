import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import type { Response } from 'express';

import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { CurrentUser } from '../common/decorators/current-user.decorator';

import { TournamentsService } from './tournaments.service';
import { SetDayCodeDto } from './dto/set-day-code.dto';
import { OrganizerTournamentDto } from './dto/organizer-tournament.dto';
import { SetParticipantDto } from './dto/set-participant.dto';

import { createImageUploadInterceptor, saveUploadedFile } from '../common/upload/upload.config';
import { ImageMagicInterceptor } from '../common/upload/image-magic.interceptor';



function parseTournamentBody(body: Record<string, any>) {

  return {

    title: body.title,

    description: body.description,

    category: body.category,

    isFree: body.isFree === 'true' || body.isFree === true,

    entryFee: Number(body.entryFee ?? 0),

    prize: body.prize || null,

    prizeAmount: body.prizeAmount ? Number(body.prizeAmount) : null,

    maxEntries: body.maxEntries ? Number(body.maxEntries) : null,

    startAt: new Date(body.startAt),

    endAt: new Date(body.endAt),

    rules: body.rules || null,

    status: body.status || 'upcoming',

  };

}



@ApiTags('대회')

@Controller('tournaments')

export class TournamentsController {

  constructor(private tournamentsService: TournamentsService) {}



  @Get()

  @ApiOperation({ summary: '대회 목록' })

  async findAll(@Query('status') status?: string, @Query('category') category?: string) {

    const result = await this.tournamentsService.findAll(status, category);

    return { success: true, data: result };

  }



  @Get('organized')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내가 운영하는 대회' })
  async listOrganized(@CurrentUser() user: any) {
    const result = await this.tournamentsService.listOrganized(user.id);
    return { success: true, data: result };
  }

  @Post('organized')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '낚시점·포인트 운영자가 무료 대회 생성' })
  async createOrganized(@CurrentUser() user: any, @Body() body: OrganizerTournamentDto) {
    const result = await this.tournamentsService.createForOrganizer(user.id, body);
    return { success: true, data: result };
  }

  @Patch('organized/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '운영 대회 수정. 참가비는 항상 무료' })
  async updateOrganized(@Param('id') id: string, @CurrentUser() user: any, @Body() body: OrganizerTournamentDto) {
    const result = await this.tournamentsService.updateForOrganizer(user.id, id, body);
    return { success: true, data: result };
  }

  @Get('organized/:id/participants')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '대회 참가자. 실격은 삭제하지 않음' })
  async listParticipants(@Param('id') id: string, @CurrentUser() user: any) {
    const result = await this.tournamentsService.listParticipants(user.id, id);
    return { success: true, data: result };
  }

  @Patch('organized/:id/participants/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '참가자 실격 또는 복귀' })
  async setParticipant(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: any,
    @Body() body: SetParticipantDto,
  ) {
    const result = await this.tournamentsService.setDisqualified(user.id, id, userId, body.disqualified, body.note);
    return { success: true, data: result };
  }

  @Get('organized/:id/export')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '실시간 순위 CSV' })
  async exportLeaderboard(@Param('id') id: string, @CurrentUser() user: any, @Res({ passthrough: true }) res: Response) {
    const csv = await this.tournamentsService.exportLeaderboard(user.id, id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="tournament-${id}.csv"`);
    return `\uFEFF${csv}`;
  }

  @Get(':id')

  @ApiOperation({ summary: '대회 상세' })

  async findOne(@Param('id') id: string) {

    const result = await this.tournamentsService.findById(id);

    return { success: true, data: result };

  }



  @Get(':id/ranking')

  @ApiOperation({ summary: '대회 참가자 랭킹' })

  async getRanking(@Param('id') id: string) {

    const result = await this.tournamentsService.getRanking(id);

    return { success: true, data: result };

  }



  @Post(':id/join')

  @UseGuards(JwtAuthGuard)

  @ApiBearerAuth()

  @ApiOperation({ summary: '대회 참가 신청' })

  async join(@Param('id') id: string, @CurrentUser() user: any) {

    const result = await this.tournamentsService.join(id, user.id);

    return { success: true, data: result };

  }



  @Get(':id/my-entry')

  @UseGuards(JwtAuthGuard)

  @ApiBearerAuth()

  @ApiOperation({ summary: '내 참가 여부 확인' })

  async getMyEntry(@Param('id') id: string, @CurrentUser() user: any) {

    const result = await this.tournamentsService.getMyEntry(id, user.id);

    return { success: true, data: result };

  }



  @Post()

  @UseGuards(JwtAuthGuard)

  @ApiBearerAuth()

  @ApiOperation({ summary: '[어드민] 대회 생성' })

  @ApiConsumes('multipart/form-data')

  @UseInterceptors(createImageUploadInterceptor('banner', 'tournament'), ImageMagicInterceptor)

  async create(

    @CurrentUser() user: any,

    @UploadedFile() file: Express.Multer.File,

    @Body() body: Record<string, any>,

  ) {

    const result = await this.tournamentsService.create(user.id, {

      ...parseTournamentBody(body),

      bannerUrl: saveUploadedFile(file),

    });

    return { success: true, data: result };

  }



  @Patch(':id/status')

  @UseGuards(JwtAuthGuard)

  @ApiBearerAuth()

  @ApiOperation({ summary: '[어드민] 대회 상태 변경' })

  async updateStatus(@Param('id') id: string, @CurrentUser() user: any, @Body('status') status: string) {

    const result = await this.tournamentsService.updateStatus(user.id, id, status);

    return { success: true, data: result };

  }



  @Patch(':id')

  @UseGuards(JwtAuthGuard)

  @ApiBearerAuth()

  @ApiOperation({ summary: '[어드민] 대회 수정' })

  @ApiConsumes('multipart/form-data')

  @UseInterceptors(createImageUploadInterceptor('banner', 'tournament'), ImageMagicInterceptor)

  async update(

    @Param('id') id: string,

    @CurrentUser() user: any,

    @UploadedFile() file: Express.Multer.File,

    @Body() body: Record<string, any>,

  ) {

    const dto: any = parseTournamentBody(body);

    const bannerUrl = saveUploadedFile(file);

    if (bannerUrl) dto.bannerUrl = bannerUrl;

    const result = await this.tournamentsService.update(user.id, id, dto);

    return { success: true, data: result };

  }

  @Get(':id/day-code')
  @ApiOperation({ summary: '오늘(서울) 대회 코드 조회' })
  async getDayCode(@Param('id') id: string) {
    const result = await this.tournamentsService.getTodayDayCode(id);
    return { success: true, data: result };
  }

  @Post(':id/day-code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[어드민] 오늘(서울) 대회 코드 등록' })
  async setDayCode(@Param('id') id: string, @CurrentUser() user: any, @Body() body: SetDayCodeDto) {
    const result = await this.tournamentsService.setTodayDayCode(user.id, id, body.code);
    return { success: true, data: result };
  }

  @Delete(':id')

  @UseGuards(JwtAuthGuard)

  @ApiBearerAuth()

  @ApiOperation({ summary: '[어드민] 대회 삭제' })

  async remove(@Param('id') id: string, @CurrentUser() user: any) {

    const result = await this.tournamentsService.delete(user.id, id);

    return { success: true, data: result };

  }

}


