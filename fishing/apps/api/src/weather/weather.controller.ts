import { Controller, Get, Query, BadRequestException, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { WeatherService } from './weather.service';
import { GeocodeService } from './geocode.service';

@ApiTags('날씨')
@Controller('weather')
export class WeatherController {
  constructor(
    private weatherService: WeatherService,
    private geocodeService: GeocodeService,
  ) {}

  @Get('search')
  @ApiOperation({ summary: '낚시 포인트·지역 검색' })
  @ApiQuery({ name: 'q', required: false, example: '해운대' })
  async searchPlaces(@Query('q') q?: string) {
    const results = q ? await this.geocodeService.search(q) : this.geocodeService.getPresets();
    return { success: true, data: results };
  }

  @Get('presets')
  @ApiOperation({ summary: '추천 낚시 포인트 목록' })
  getPresets() {
    return { success: true, data: this.geocodeService.getPresets() };
  }

  @Get('reverse')
  @ApiOperation({ summary: '좌표 → 행정구역 (GPS 지역 추정)' })
  @ApiQuery({ name: 'lat', required: true, example: 37.5665 })
  @ApiQuery({ name: 'lng', required: true, example: 126.978 })
  async reverseRegion(@Query('lat') latStr: string, @Query('lng') lngStr: string) {
    const lat = Number(latStr);
    const lng = Number(lngStr);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException('lat, lng는 숫자여야 합니다');
    }
    if (lat < 33 || lat > 39 || lng < 124 || lng > 132) {
      throw new BadRequestException('한국 지역 좌표만 지원합니다 (lat 33~39, lng 124~132)');
    }

    const data = await this.geocodeService.reverseRegion(lat, lng);
    return { success: true, data };
  }

  @Get()
  @Header('Cache-Control', 'public, max-age=180')
  @ApiOperation({ summary: '기상청 날씨 조회 (위·경도)' })
  @ApiQuery({ name: 'lat', required: true, example: 37.5665 })
  @ApiQuery({ name: 'lng', required: true, example: 126.978 })
  @ApiQuery({ name: 'label', required: false, example: '서울' })
  async getWeather(
    @Query('lat') latStr: string,
    @Query('lng') lngStr: string,
    @Query('label') label?: string,
  ) {
    const lat = Number(latStr);
    const lng = Number(lngStr);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException('lat, lng는 숫자여야 합니다');
    }
    if (lat < 33 || lat > 39 || lng < 124 || lng > 132) {
      throw new BadRequestException('한국 지역 좌표만 지원합니다 (lat 33~39, lng 124~132)');
    }

    const data = await this.weatherService.getWeather(lat, lng, label);
    return { success: true, data };
  }
}
