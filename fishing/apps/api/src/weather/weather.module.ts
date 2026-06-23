import { Module } from '@nestjs/common';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';
import { GeocodeService } from './geocode.service';

@Module({
  controllers: [WeatherController],
  providers: [WeatherService, GeocodeService],
})
export class WeatherModule {}
