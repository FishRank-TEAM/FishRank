import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('어종')
@Controller('species')
export class SpeciesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: '어종 목록' })
  async getAll() {
    const species = await this.prisma.fishSpecies.findMany({
      orderBy: { id: 'asc' },
    });
    return { success: true, data: species };
  }
}
