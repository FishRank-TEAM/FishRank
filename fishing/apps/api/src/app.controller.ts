import { Controller, Get } from '@nestjs/common';

export type HealthPayload = { status: 'ok'; timestamp: string };

export function healthPayload(now = new Date()): HealthPayload {
  return { status: 'ok', timestamp: now.toISOString() };
}

@Controller()
export class AppController {
  @Get('health')
  health(): HealthPayload {
    return healthPayload();
  }

  @Get('api/v1/health')
  healthUnderApiPrefix(): HealthPayload {
    return healthPayload();
  }
}
