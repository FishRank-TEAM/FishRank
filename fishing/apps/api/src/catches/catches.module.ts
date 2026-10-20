import { Module } from '@nestjs/common';
import { CatchesService } from './catches.service';
import { CatchesController } from './catches.controller';
import { CaptureSessionService } from './capture-session.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [CatchesController],
  providers: [CatchesService, CaptureSessionService],
})
export class CatchesModule {}
