import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('api/v1/health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
