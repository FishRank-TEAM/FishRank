import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { CurrentUser } from '../common/decorators/current-user.decorator';

import { UsersService } from './users.service';

import { UpdateProfileDto } from './dto/update-profile.dto';

import { UpdateFeaturedCatchesDto } from './dto/update-featured-catches.dto';

import { UpsertUserGearDto } from './dto/upsert-user-gear.dto';

import { createImageUploadInterceptor, saveUploadedFile } from '../common/upload/upload.config';



@ApiTags('사용자')

@Controller('users')

export class UsersController {

  constructor(private usersService: UsersService) {}



  @Get('me')

  @UseGuards(JwtAuthGuard)

  @ApiBearerAuth()

  @ApiOperation({ summary: '내 프로필 조회' })

  async getMe(@CurrentUser() user: any) {

    const fullUser = await this.usersService.findById(user.id);

    const [stats, posts, featuredCatches, gears] = await Promise.all([
      this.usersService.getMyStats(user.id),
      this.usersService.getMyPosts(user.id),
      this.usersService.getFeaturedCatches(user.id, fullUser!.featuredCatchIds),
      this.usersService.getUserGears(user.id),
    ]);

    return {

      success: true,

      data: {

        id: fullUser!.id,

        email: fullUser!.email,

        nickname: fullUser!.nickname,

        role: fullUser!.role,

        profileImage: fullUser!.profileImage,

        bio: fullUser!.bio,

        activityRegion: fullUser!.activityRegion,

        fishingCategory: fullUser!.fishingCategory,

        featuredCatchIds: fullUser!.featuredCatchIds,

        featuredCatches,

        gears,

        stats,

        posts,

      },

    };

  }



  @Patch('me')

  @UseGuards(JwtAuthGuard)

  @ApiBearerAuth()

  @ApiOperation({ summary: '내 프로필 수정' })

  async updateMe(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {

    const updated = await this.usersService.updateProfile(user.id, dto);

    return { success: true, data: updated };

  }



  @Patch('me/profile-image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '프로필 사진 변경' })
  @UseInterceptors(createImageUploadInterceptor('image', 'profile'))
  async updateProfileImage(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    const profileImage = saveUploadedFile(file);
    if (!profileImage) {
      throw new BadRequestException('이미지 파일이 필요합니다.');
    }
    const updated = await this.usersService.updateProfileImage(user.id, profileImage);
    return { success: true, data: updated };
  }

  @Delete('me/profile-image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '프로필 사진 삭제' })
  async deleteProfileImage(@CurrentUser() user: any) {
    const updated = await this.usersService.updateProfileImage(user.id, null);
    return { success: true, data: updated };
  }

  @Patch('me/featured-catches')

  @UseGuards(JwtAuthGuard)

  @ApiBearerAuth()

  @ApiOperation({ summary: '대표 낚시 기록 설정 (최대 3개)' })

  async updateFeaturedCatches(@CurrentUser() user: any, @Body() dto: UpdateFeaturedCatchesDto) {

    const featuredCatches = await this.usersService.updateFeaturedCatches(user.id, dto.catchIds);

    return { success: true, data: { featuredCatchIds: dto.catchIds, featuredCatches } };

  }



  @Post('me/gears')

  @UseGuards(JwtAuthGuard)

  @ApiBearerAuth()

  @ApiConsumes('multipart/form-data')

  @ApiOperation({ summary: '내 장비 등록 (최대 6개)' })

  @UseInterceptors(createImageUploadInterceptor('image', 'gear'))

  async createGear(

    @CurrentUser() user: any,

    @UploadedFile() file: Express.Multer.File | undefined,

    @Body() dto: UpsertUserGearDto,

  ) {

    const gear = await this.usersService.createUserGear(

      user.id,

      dto,

      saveUploadedFile(file),

    );

    return { success: true, data: gear };

  }



  @Patch('me/gears/:gearId')

  @UseGuards(JwtAuthGuard)

  @ApiBearerAuth()

  @ApiConsumes('multipart/form-data')

  @ApiOperation({ summary: '내 장비 수정' })

  @UseInterceptors(createImageUploadInterceptor('image', 'gear'))

  async updateGear(

    @CurrentUser() user: any,

    @Param('gearId') gearId: string,

    @UploadedFile() file: Express.Multer.File | undefined,

    @Body() dto: UpsertUserGearDto,

  ) {

    const gear = await this.usersService.updateUserGear(

      user.id,

      gearId,

      dto,

      file ? saveUploadedFile(file) : undefined,

    );

    return { success: true, data: gear };

  }



  @Delete('me/gears/:gearId')

  @UseGuards(JwtAuthGuard)

  @ApiBearerAuth()

  @ApiOperation({ summary: '내 장비 삭제' })

  async deleteGear(@CurrentUser() user: any, @Param('gearId') gearId: string) {

    await this.usersService.deleteUserGear(user.id, gearId);

    return { success: true };

  }



  @Get('profile/:nickname')

  @ApiOperation({ summary: '유저 공개 프로필 조회' })

  async getProfile(@Param('nickname') nickname: string) {

    const result = await this.usersService.getPublicProfile(nickname);

    return { success: true, data: result };

  }

}


