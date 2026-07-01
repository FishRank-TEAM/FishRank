import { CanActivate, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class DevOnlyGuard implements CanActivate {
  canActivate(): boolean {
    const enabled =
      process.env.NODE_ENV !== 'production' || process.env.AI_TESTER_ENABLED === 'true';

    if (!enabled) {
      throw new ForbiddenException('AI 테스터는 개발 환경에서만 사용할 수 있습니다.');
    }

    return true;
  }
}
