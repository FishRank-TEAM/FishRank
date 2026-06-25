import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FeedbacksService } from './feedbacks.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@ApiTags('피드백')
@Controller('feedbacks')
export class FeedbacksController {
  constructor(private feedbacks: FeedbacksService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '서비스 피드백 제출' })
  async create(@CurrentUser() user: { id: string }, @Body() dto: CreateFeedbackDto) {
    const data = await this.feedbacks.create(user.id, dto);
    return { success: true, data };
  }
}
