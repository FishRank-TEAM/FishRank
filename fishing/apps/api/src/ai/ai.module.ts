import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { DevOnlyGuard } from './dev-only.guard';

@Module({
  imports: [PrismaModule],
  controllers: [AiController],
  providers: [AiService, DevOnlyGuard],
  exports: [AiService],
})
export class AiModule {}