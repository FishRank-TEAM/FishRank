import { Module } from '@nestjs/common';
import { FishInfoController } from './fish-info.controller';
import { FishInfoService } from './fish-info.service';
import { InaturalistClient } from './inaturalist.client';
import { PublicDataFishClient } from './public-data-fish.client';

@Module({
  controllers: [FishInfoController],
  providers: [FishInfoService, InaturalistClient, PublicDataFishClient],
  exports: [FishInfoService, InaturalistClient, PublicDataFishClient],
})
export class FishInfoModule {}
