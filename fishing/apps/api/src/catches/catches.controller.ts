import {

  Controller,

  Post,

  Get,

  Patch,

  Delete,

  Param,

  Query,

  UseGuards,

  UseInterceptors,

  UploadedFile,

  Body,

  Headers,

  HttpCode,

} from '@nestjs/common';

import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { CurrentUser } from '../common/decorators/current-user.decorator';

import { CatchesService } from './catches.service';

import { createImageUploadInterceptor } from '../common/upload/upload.config';
import { assertAppUploadChannel } from '../common/upload/upload-channel.util';
import { UpdatePersonalCatchDto } from './dto/update-personal-catch.dto';



@ApiTags('낚시 기록')

@Controller('catches')

export class CatchesController {

  constructor(private catchesService: CatchesService) {}



  @Post()

  @UseGuards(JwtAuthGuard)

  @ApiBearerAuth()

  @ApiOperation({ summary: '인증 기록 업로드 (줄자 AI 측정)' })

  @ApiConsumes('multipart/form-data')

  @HttpCode(202)

  @UseInterceptors(createImageUploadInterceptor('image', 'catch'))

  async createCertified(

    @CurrentUser() user: any,

    @UploadedFile() file: Express.Multer.File,

    @Body() body: any,

    @Headers('x-upload-channel') uploadChannel?: string,

  ) {

    assertAppUploadChannel(uploadChannel);

    const result = await this.catchesService.createCertified(user.id, file, body);

    return { success: true, data: result };

  }



  @Post('personal')

  @UseGuards(JwtAuthGuard)

  @ApiBearerAuth()

  @ApiOperation({ summary: '비공식 자랑 기록 업로드' })

  @ApiConsumes('multipart/form-data')

  @HttpCode(201)

  @UseInterceptors(createImageUploadInterceptor('image', 'personal'))

  async createPersonal(

    @CurrentUser() user: any,

    @UploadedFile() file: Express.Multer.File,

    @Body() body: any,

  ) {

    const result = await this.catchesService.createPersonal(user.id, file, body);

    return { success: true, data: result };

  }



  @Get('me')

  @UseGuards(JwtAuthGuard)

  @ApiBearerAuth()

  @ApiOperation({ summary: '내 기록 목록' })

  async getMyList(

    @CurrentUser() user: any,

    @Query('page') page = 1,

    @Query('limit') limit = 20,

    @Query('recordType') recordType?: string,

  ) {

    const result = await this.catchesService.findMyList(

      user.id,

      Number(page),

      Number(limit),

      recordType,

    );

    return { success: true, data: result };

  }



  @Patch(':id/personal')

  @UseGuards(JwtAuthGuard)

  @ApiBearerAuth()

  @ApiOperation({ summary: '자랑 기록 수정' })

  async updatePersonal(

    @CurrentUser() user: any,

    @Param('id') id: string,

    @Body() body: UpdatePersonalCatchDto,

  ) {

    const result = await this.catchesService.updatePersonal(user.id, id, body);

    return { success: true, data: result };

  }



  @Delete(':id/personal')

  @UseGuards(JwtAuthGuard)

  @ApiBearerAuth()

  @ApiOperation({ summary: '자랑 기록 삭제' })

  async deletePersonal(

    @CurrentUser() user: any,

    @Param('id') id: string,

  ) {

    await this.catchesService.deletePersonal(user.id, id);

    return { success: true, data: { deleted: true } };

  }



  @Post(':id/vote')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '자랑 기록 추천 토글' })
  async toggleVote(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.catchesService.toggleVote(id, user.id);
    return { success: true, data: result };
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '자랑 기록 좋아요 (추가만)' })
  async addVote(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.catchesService.addVote(id, user.id);
    return { success: true, data: result };
  }

  @Get(':id/votes')
  @ApiOperation({ summary: '추천 수 조회' })
  async getVotes(@Param('id') id: string) {
    const result = await this.catchesService.getVoteSummary(id);
    return { success: true, data: result };
  }

  @Get(':id/status')

  @UseGuards(JwtAuthGuard)

  @ApiBearerAuth()

  @ApiOperation({ summary: 'AI 처리 상태 확인' })

  async getStatus(@Param('id') id: string) {

    const result = await this.catchesService.findStatus(id);

    return { success: true, data: result };

  }



  @Get(':id')

  @ApiOperation({ summary: '낚시 기록 단건 조회' })

  async findOne(@Param('id') id: string) {

    const result = await this.catchesService.findById(id);

    return { success: true, data: result };

  }

}


