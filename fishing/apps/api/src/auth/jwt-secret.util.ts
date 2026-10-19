const MIN_JWT_SECRET_LENGTH = 16;

/** 비어 있거나 짧은 시크릿으로 토큰이 서명되지 않도록 기동 시점에 거절한다. */
export function assertJwtSecret(secret: string | undefined | null): string {
  const value = secret?.trim() ?? '';
  if (value.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET은 ${MIN_JWT_SECRET_LENGTH}자 이상이어야 합니다. apps/api/.env 를 확인하세요.`,
    );
  }
  return value;
}
