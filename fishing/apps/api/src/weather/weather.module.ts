import { Module } from '@nestjs/common';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';
import { GeocodeService } from './geocode.service';
import { KhoaPublicClient } from './khoa-public.client';
import { ReservoirPublicClient } from './reservoir-public.client';
import { MarineConditionsService } from './marine-conditions.service';

@Module({
  controllers: [WeatherController],
  providers: [
    WeatherService,
    GeocodeService,
    KhoaPublicClient,
    ReservoirPublicClient,
    MarineConditionsService,
  ],
})
export class WeatherModule {}
