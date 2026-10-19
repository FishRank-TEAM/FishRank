import { RequestMethod } from '@nestjs/common';

export const API_GLOBAL_PREFIX = 'api/v1';

/**
 * 헬스 체크는 로드밸런서(`GET /health`)와 API 클라이언트(`GET /api/v1/health`)
 * 양쪽에서 호출된다. 글로벌 prefix를 그대로 붙이면 `/api/v1/api/v1/health`가 된다.
 */
export const GLOBAL_PREFIX_EXCLUDES: { path: string; method: RequestMethod }[] = [
  { path: 'health', method: RequestMethod.GET },
  { path: 'api/v1/health', method: RequestMethod.GET },
];
