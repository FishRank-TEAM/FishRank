import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { createImageUploadInterceptor } from '../common/upload/upload.config';
import { AiService } from '../ai/ai.service';

@ApiTags('정밀 측정')
@ApiBearerAuth()
@Controller('ai')
export class MeasureController {
  constructor(private readonly aiService: AiService) {}

  @Post('keypoints')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '이미지에서 머리/꼬리 키포인트 검출 (LiDAR 측정용)' })
  @UseInterceptors(createImageUploadInterceptor('image', 'measure-kp'))
  async keypoints(@UploadedFile() file: Express.Multer.File) {
    if (!file?.filename) {
      throw new BadRequestException('이미지 파일이 필요합니다.');
    }

    const imageUrl = `/uploads/${file.filename}`;
    const started = Date.now();
    const result = await this.aiService.keypoints(imageUrl);

    return {
      success: true,
      data: {
        ...result,
        imageUrl,
        processingMs: Date.now() - started,
      },
    };
  }
}
