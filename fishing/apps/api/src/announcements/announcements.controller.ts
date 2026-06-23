import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from '../admin/admin.service';

@ApiTags('공지')
@Controller('announcements')
export class AnnouncementsController {
  constructor(private admin: AdminService) {}

  @Get()
  @ApiOperation({ summary: '공개 공지·이벤트 목록' })
  async list(@Query('limit') limit = '10') {
    const data = await this.admin.getPublicAnnouncements(Number(limit) || 10);
    return { success: true, data };
  }
}
