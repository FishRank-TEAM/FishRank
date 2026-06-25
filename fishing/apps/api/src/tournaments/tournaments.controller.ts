import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';

import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { CurrentUser } from '../common/decorators/current-user.decorator';

import { TournamentsService } from './tournaments.service';

import { createImageUploadInterceptor, saveUploadedFile } from '../common/upload/upload.config';



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

  @UseInterceptors(createImageUploadInterceptor('banner', 'tournament'))

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

  @UseInterceptors(createImageUploadInterceptor('banner', 'tournament'))

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

  @Delete(':id')

  @UseGuards(JwtAuthGuard)

  @ApiBearerAuth()

  @ApiOperation({ summary: '[어드민] 대회 삭제' })

  async remove(@Param('id') id: string, @CurrentUser() user: any) {

    const result = await this.tournamentsService.delete(user.id, id);

    return { success: true, data: result };

  }

}


