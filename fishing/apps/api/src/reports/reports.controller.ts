import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';

@ApiTags('신고')
@Controller('reports')
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '콘텐츠 신고' })
  async create(@CurrentUser() user: { id: string }, @Body() dto: CreateReportDto) {
    const data = await this.reports.create(user.id, dto);
    return { success: true, data };
  }
}
