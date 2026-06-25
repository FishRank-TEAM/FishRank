import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HomeService } from './home.service';

@ApiTags('홈')
@Controller('home')
export class HomeController {
  constructor(private readonly home: HomeService) {}

  @Get()
  @ApiOperation({ summary: '메인 홈 — 랭킹·대회·게시글·공지 일괄 조회' })
  async getHome() {
    const data = await this.home.getHomePayload();
    return { success: true, data };
  }
}
