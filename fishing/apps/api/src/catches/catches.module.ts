import { Module } from '@nestjs/common';
import { CatchesService } from './catches.service';
import { CatchesController } from './catches.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [CatchesController],
  providers: [CatchesService],
})
export class CatchesModule {}
